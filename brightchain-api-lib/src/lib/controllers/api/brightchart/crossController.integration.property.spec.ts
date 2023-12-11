/**
 * Cross-Controller Integration Property Tests
 *
 * Feature: org-role-integration-tests
 *
 * Exercises multi-controller flows where OrganizationController,
 * HealthcareRoleController, and InvitationController share a single
 * in-memory database, verifying cross-controller data flow, authorization,
 * and role retrieval end-to-end.
 *
 * Property 1: End-to-end lifecycle produces correct roles across controllers
 * Property 2: Organization display name round-trip across controllers
 * Property 3: Invitation redemption creates retrievable role with correct data
 * Property 4: Re-redemption of used invitation returns 410
 * Property 5: Invite-only patient registration via invitation token
 * Property 6: Non-admin member gets 403 on cross-controller staff assignment
 * Property 7: Practitioner staff can create invitations cross-controller
 * Property 8: Soft-deleted admin role blocks org update cross-controller
 * Property 9: No cross-contamination between members' roles
 * Property 10: Invitation-created role indistinguishable from direct assignment in GET response
 * Property 11: Organization members listing scoped to org only
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4**
 */

import { ADMIN, PATIENT } from '@brightchain/brightchart-lib';
import * as fc from 'fast-check';
import {
  assignStaff,
  createIntegrationControllers,
  createInvitation,
  createOrg,
  getMyRoles,
  memberIdArb,
  orgNameArb,
  redeemInvitation,
  registerPatient,
  setEnrollmentMode,
  validInvitationRoleCodeArb,
  validPractitionerCodeArb,
} from './crossController.integration.helpers';

// ─── Response shape from getMyRoles ──────────────────────────────────────────
//
// The HealthcareRoleController GET handler maps stored docs into:
//   { roleCode, roleDisplay, organization: { reference, display },
//     practitioner: { reference, display }, patient: { reference, display }, period }
//
// organizationId is NOT present — use organization.reference to match.

interface RoleResponse {
  roleCode: string;
  roleDisplay: string;
  organization: { reference: string; display: string };
  practitioner?: { reference: string; display: string };
  patient?: { reference: string; display: string };
  period: { start: string; end?: string };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Cross-Controller Integration Property Tests', () => {
  // ── Property 1 ─────────────────────────────────────────────────────────────

  describe('Property 1: End-to-end lifecycle produces correct roles across controllers', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.5**
     *
     * For any valid org name, admin member, staff member, and patient member,
     * creating an org → assigning staff → registering patient → GET roles for
     * each member verifies:
     *   (a) auto-admin role retrievable for admin
     *   (b) staff role has correct orgId
     *   (c) PATIENT role has correct orgId and patientRef
     */
    it('create org → assign staff → register patient → GET roles returns correct data for each member', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName, adminId, staffId, patientId, staffRoleCode) => {
            // Feature: org-role-integration-tests, Property 1: End-to-end lifecycle produces correct roles across controllers
            fc.pre(adminId !== staffId);
            fc.pre(adminId !== patientId);
            fc.pre(staffId !== patientId);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);
            const orgRef = `Organization/${orgId}`;

            // 2. Assign staff role
            const staffRoleDoc = await assignStaff(
              roleHandlers,
              adminId,
              staffId,
              staffRoleCode,
              orgId,
            );

            // 3. Register patient (open enrollment by default)
            const patientRoleDoc = await registerPatient(
              roleHandlers,
              patientId,
              orgId,
            );

            // 4. GET roles for each member and verify

            // (a) Admin: auto-admin role retrievable with correct org display
            const adminRoles = (await getMyRoles(
              roleHandlers,
              adminId,
            )) as unknown as RoleResponse[];
            const adminRole = adminRoles.find(
              (r) =>
                r.roleCode === ADMIN && r.organization.reference === orgRef,
            );
            expect(adminRole).toBeDefined();
            expect(adminRole!.organization.display).toBe(orgName);

            // (b) Staff: role has correct orgId and org display
            const staffRoles = (await getMyRoles(
              roleHandlers,
              staffId,
            )) as unknown as RoleResponse[];
            const foundStaffRole = staffRoles.find(
              (r) =>
                r.roleCode === staffRoleCode &&
                r.organization.reference === orgRef,
            );
            expect(foundStaffRole).toBeDefined();
            expect(foundStaffRole!.organization.display).toBe(orgName);

            // (c) Patient: role has correct orgId and patientRef
            const patientRoles = (await getMyRoles(
              roleHandlers,
              patientId,
            )) as unknown as RoleResponse[];
            const foundPatientRole = patientRoles.find(
              (r) =>
                r.roleCode === PATIENT && r.organization.reference === orgRef,
            );
            expect(foundPatientRole).toBeDefined();
            expect(foundPatientRole!.organization.display).toBe(orgName);
            expect(foundPatientRole!.patient).toBeDefined();
            expect(foundPatientRole!.patient!.reference).toBe(
              `Patient/${patientId}`,
            );

            // Verify the staff role doc returned from assignment matches
            expect(staffRoleDoc['organizationId']).toBe(orgId);
            expect(staffRoleDoc['roleCode']).toBe(staffRoleCode);

            // Verify the patient role doc returned from registration matches
            expect(patientRoleDoc['organizationId']).toBe(orgId);
            expect(patientRoleDoc['roleCode']).toBe(PATIENT);
            expect(patientRoleDoc['patientRef']).toBe(patientId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 2 ─────────────────────────────────────────────────────────────

  describe('Property 2: Organization display name round-trip across controllers', () => {
    /**
     * **Validates: Requirements 1.3, 1.4, 5.2**
     *
     * For any set of org names and role assignments across multiple orgs,
     * GET roles SHALL return each role with `organization.display` exactly
     * matching the org name from creation.
     */
    it('GET roles returns organization.display matching the org name from creation across multiple orgs', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2–4 distinct org names
          fc
            .array(orgNameArb, { minLength: 2, maxLength: 4 })
            .filter(
              (names) => new Set(names).size === names.length,
            ),
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgNames, adminId, staffId, staffRoleCode) => {
            // Feature: org-role-integration-tests, Property 2: Organization display name round-trip across controllers
            fc.pre(adminId !== staffId);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // Create multiple orgs and assign a staff role in each
            const orgEntries: Array<{ orgId: string; orgName: string }> = [];
            for (const name of orgNames) {
              const orgId = await createOrg(orgHandlers, adminId, name);
              await assignStaff(
                roleHandlers,
                adminId,
                staffId,
                staffRoleCode,
                orgId,
              );
              orgEntries.push({ orgId, orgName: name });
            }

            // GET roles for admin — should have an ADMIN role per org
            const adminRoles = (await getMyRoles(
              roleHandlers,
              adminId,
            )) as unknown as RoleResponse[];

            for (const { orgId, orgName } of orgEntries) {
              const orgRef = `Organization/${orgId}`;
              const role = adminRoles.find(
                (r) =>
                  r.roleCode === ADMIN &&
                  r.organization.reference === orgRef,
              );
              expect(role).toBeDefined();
              expect(role!.organization.display).toBe(orgName);
            }

            // GET roles for staff — should have the assigned role per org
            const staffRoles = (await getMyRoles(
              roleHandlers,
              staffId,
            )) as unknown as RoleResponse[];

            for (const { orgId, orgName } of orgEntries) {
              const orgRef = `Organization/${orgId}`;
              const role = staffRoles.find(
                (r) =>
                  r.roleCode === staffRoleCode &&
                  r.organization.reference === orgRef,
              );
              expect(role).toBeDefined();
              expect(role!.organization.display).toBe(orgName);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 3 ─────────────────────────────────────────────────────────────

  describe('Property 3: Invitation redemption creates retrievable role with correct data', () => {
    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     *
     * For any valid org, invitation role code, and redeeming member,
     * create invitation → redeem → GET roles; verify role is retrievable
     * with correct `organization.display` and `roleCode`.
     */
    it('create invitation → redeem → GET roles returns role with correct org display and roleCode', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, redeemerId, invRoleCode) => {
            // Feature: org-role-integration-tests, Property 3: Invitation redemption creates retrievable role with correct data
            fc.pre(adminId !== redeemerId);

            const { orgHandlers, roleHandlers, invHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);
            const orgRef = `Organization/${orgId}`;

            // 2. Create invitation for the given role code
            const token = await createInvitation(
              invHandlers,
              adminId,
              orgId,
              invRoleCode,
            );
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // 3. Redeem the invitation (returns 201 Created)
            const redeemResult = await redeemInvitation(
              invHandlers,
              redeemerId,
              token,
            );
            expect(redeemResult.statusCode).toBe(201);

            // 4. GET roles for the redeemer and verify
            const roles = (await getMyRoles(
              roleHandlers,
              redeemerId,
            )) as unknown as RoleResponse[];

            const redeemedRole = roles.find(
              (r) =>
                r.roleCode === invRoleCode &&
                r.organization.reference === orgRef,
            );
            expect(redeemedRole).toBeDefined();
            expect(redeemedRole!.organization.display).toBe(orgName);
            expect(redeemedRole!.roleCode).toBe(invRoleCode);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 4 ─────────────────────────────────────────────────────────────

  describe('Property 4: Re-redemption of used invitation returns 410', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * For any valid invitation that has been redeemed once, attempting to
     * redeem the same token a second time SHALL return HTTP 410 with error
     * code GONE, and no additional healthcare role SHALL be created.
     */
    it('redeeming the same invitation token twice returns 410 GONE and creates no extra role', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validInvitationRoleCodeArb,
          async (orgName, adminId, firstRedeemer, secondRedeemer, invRoleCode) => {
            // Feature: org-role-integration-tests, Property 4: Re-redemption of used invitation returns 410
            fc.pre(adminId !== firstRedeemer);
            fc.pre(adminId !== secondRedeemer);

            const { orgHandlers, roleHandlers, invHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);
            const orgRef = `Organization/${orgId}`;

            // 2. Create invitation
            const token = await createInvitation(
              invHandlers,
              adminId,
              orgId,
              invRoleCode,
            );

            // 3. First redemption — should succeed (201)
            const firstResult = await redeemInvitation(
              invHandlers,
              firstRedeemer,
              token,
            );
            expect(firstResult.statusCode).toBe(201);

            // Snapshot role count for the second redeemer before re-redemption
            const rolesBefore = (await getMyRoles(
              roleHandlers,
              secondRedeemer,
            )) as unknown as RoleResponse[];
            const countBefore = rolesBefore.filter(
              (r) => r.organization.reference === orgRef,
            ).length;

            // 4. Second redemption — SHALL return 410 GONE
            const secondResult = await redeemInvitation(
              invHandlers,
              secondRedeemer,
              token,
            );
            expect(secondResult.statusCode).toBe(410);

            const errorBody = secondResult.response as {
              success: boolean;
              error: { code: string; message: string };
            };
            expect(errorBody.error.code).toBe('GONE');

            // 5. Verify no additional role was created for the second redeemer
            const rolesAfter = (await getMyRoles(
              roleHandlers,
              secondRedeemer,
            )) as unknown as RoleResponse[];
            const countAfter = rolesAfter.filter(
              (r) => r.organization.reference === orgRef,
            ).length;
            expect(countAfter).toBe(countBefore);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 5 ─────────────────────────────────────────────────────────────

  describe('Property 5: Invite-only patient registration via invitation token', () => {
    /**
     * **Validates: Requirements 2.5**
     *
     * For any invite-only org with a PATIENT invitation, redeeming the
     * invitation via the patient registration endpoint SHALL create a
     * PATIENT role that is retrievable via HealthcareRoleController GET.
     */
    it('invite-only org + PATIENT invitation → registerPatient with token → PATIENT role retrievable via GET', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          async (orgName, adminId, redeemerId) => {
            // Feature: org-role-integration-tests, Property 5: Invite-only patient registration via invitation token
            fc.pre(adminId !== redeemerId);

            const { orgHandlers, roleHandlers, invHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);
            const orgRef = `Organization/${orgId}`;

            // 2. Set enrollment mode to invite-only
            await setEnrollmentMode(orgHandlers, orgId, adminId, 'invite-only');

            // 3. Create a PATIENT invitation
            const token = await createInvitation(
              invHandlers,
              adminId,
              orgId,
              PATIENT,
            );
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // 4. Redeem via patient registration endpoint with invitation token
            const patientRoleDoc = await registerPatient(
              roleHandlers,
              redeemerId,
              orgId,
              { invitationToken: token },
            );

            // Verify the returned role doc
            expect(patientRoleDoc['organizationId']).toBe(orgId);
            expect(patientRoleDoc['roleCode']).toBe(PATIENT);

            // 5. GET roles and verify the PATIENT role is retrievable
            const roles = (await getMyRoles(
              roleHandlers,
              redeemerId,
            )) as unknown as RoleResponse[];

            const patientRole = roles.find(
              (r) =>
                r.roleCode === PATIENT &&
                r.organization.reference === orgRef,
            );
            expect(patientRole).toBeDefined();
            expect(patientRole!.organization.display).toBe(orgName);
            expect(patientRole!.patient).toBeDefined();
            expect(patientRole!.patient!.reference).toBe(
              `Patient/${redeemerId}`,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 6 ─────────────────────────────────────────────────────────────

  describe('Property 6: Non-admin member gets 403 on cross-controller staff assignment', () => {
    /**
     * **Validates: Requirements 3.1**
     *
     * For any organization and any member who does not hold an ADMIN role
     * at that organization, attempting to assign staff via
     * HealthcareRoleController SHALL return HTTP 403, verifying that the
     * authorization check reads from the shared database populated by
     * OrganizationController.
     */
    it('non-admin member attempting staff assignment gets 403', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName, adminId, nonAdminId, targetId, roleCode) => {
            // Feature: org-role-integration-tests, Property 6: Non-admin member gets 403 on cross-controller staff assignment
            fc.pre(adminId !== nonAdminId);
            fc.pre(adminId !== targetId);
            fc.pre(nonAdminId !== targetId);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // 1. Create org (adminId gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // 2. Non-admin member attempts to assign staff directly
            const result = await roleHandlers.assignStaff({
              body: {
                memberId: targetId,
                roleCode,
                organizationId: orgId,
              },
              memberContext: { memberId: nonAdminId },
            });

            // 3. Verify 403 Forbidden
            expect(result.statusCode).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 7 ─────────────────────────────────────────────────────────────

  describe('Property 7: Practitioner staff can create invitations cross-controller', () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * For any organization where a member holds a practitioner (non-admin,
     * non-patient) role assigned via HealthcareRoleController, that member
     * SHALL be able to create invitations via InvitationController, verifying
     * that InvitationController's `isStaffAtOrg` check reads from the shared
     * database.
     */
    it('practitioner staff member can create invitations via InvitationController', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb.filter((code) => code !== ADMIN),
          validInvitationRoleCodeArb,
          async (orgName, adminId, practitionerId, practitionerRoleCode, invRoleCode) => {
            // Feature: org-role-integration-tests, Property 7: Practitioner staff can create invitations cross-controller
            fc.pre(adminId !== practitionerId);

            const { orgHandlers, roleHandlers, invHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // 2. Admin assigns a practitioner role to the second member
            await assignStaff(
              roleHandlers,
              adminId,
              practitionerId,
              practitionerRoleCode,
              orgId,
            );

            // 3. The practitioner creates an invitation via InvitationController
            const result = await invHandlers.createInvitation({
              body: { organizationId: orgId, roleCode: invRoleCode },
              memberContext: { memberId: practitionerId },
            });

            // 4. Verify the invitation creation succeeds (status 201)
            expect(result.statusCode).toBe(201);

            const body = result.response as unknown as {
              data: Record<string, unknown>;
            };
            expect(body.data['token']).toBeDefined();
            expect(typeof body.data['token']).toBe('string');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 8 ─────────────────────────────────────────────────────────────

  describe('Property 8: Soft-deleted admin role blocks org update cross-controller', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * For any organization with two admin members, soft-deleting one admin's
     * role via HealthcareRoleController SHALL cause OrganizationController to
     * return HTTP 403 when that member attempts to update the organization,
     * verifying that the admin guard reads `period.end` from the shared
     * database.
     */
    it('soft-deleting admin role via RoleController causes OrgController to return 403 on update', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          async (orgName, admin1Id, admin2Id) => {
            // Feature: org-role-integration-tests, Property 8: Soft-deleted admin role blocks org update cross-controller
            fc.pre(admin1Id !== admin2Id);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin1 gets auto-admin role)
            const orgId = await createOrg(orgHandlers, admin1Id, orgName);

            // 2. Admin1 assigns ADMIN role to admin2
            const admin2RoleDoc = await assignStaff(
              roleHandlers,
              admin1Id,
              admin2Id,
              ADMIN,
              orgId,
            );
            const admin2RoleId = admin2RoleDoc['_id'] as string;

            // 3. Soft-delete admin2's role via HealthcareRoleController
            const removeResult = await roleHandlers.removeRole({
              params: { id: admin2RoleId },
              memberContext: { memberId: admin1Id },
            });
            expect(removeResult.statusCode).toBe(200);

            // 4. Admin2 attempts to update the org via OrganizationController
            const updateResult = await orgHandlers.updateOrganization({
              params: { id: orgId },
              body: { name: 'Updated Name' },
              memberContext: { memberId: admin2Id },
            });

            // 5. Verify 403 Forbidden
            expect(updateResult.statusCode).toBe(403);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 9 ─────────────────────────────────────────────────────────────

  describe('Property 9: No cross-contamination between members\' roles', () => {
    /**
     * **Validates: Requirements 5.1**
     *
     * For any valid sequence of org creation, staff assignments with distinct
     * role codes, and patient registrations, GET roles for each member SHALL
     * return exactly the roles assigned to that member, with no roles
     * belonging to other members.
     */
    it('GET roles for each member returns only that member\'s roles with no cross-contamination', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          fc.tuple(
            validPractitionerCodeArb,
            validPractitionerCodeArb,
          ),
          async (orgName, adminId, staff1Id, staff2Id, patientId, [roleCode1, roleCode2]) => {
            // Feature: org-role-integration-tests, Property 9: No cross-contamination between members' roles
            fc.pre(adminId !== staff1Id);
            fc.pre(adminId !== staff2Id);
            fc.pre(adminId !== patientId);
            fc.pre(staff1Id !== staff2Id);
            fc.pre(staff1Id !== patientId);
            fc.pre(staff2Id !== patientId);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);

            // 2. Assign distinct staff roles to two different members
            await assignStaff(roleHandlers, adminId, staff1Id, roleCode1, orgId);
            await assignStaff(roleHandlers, adminId, staff2Id, roleCode2, orgId);

            // 3. Register a patient
            await registerPatient(roleHandlers, patientId, orgId);

            // 4. GET roles for each member
            const adminRoles = (await getMyRoles(
              roleHandlers,
              adminId,
            )) as unknown as RoleResponse[];
            const staff1Roles = (await getMyRoles(
              roleHandlers,
              staff1Id,
            )) as unknown as RoleResponse[];
            const staff2Roles = (await getMyRoles(
              roleHandlers,
              staff2Id,
            )) as unknown as RoleResponse[];
            const patientRoles = (await getMyRoles(
              roleHandlers,
              patientId,
            )) as unknown as RoleResponse[];

            // 5. Verify each member's roles contain ONLY their own roles

            // Admin: every role should reference the admin as practitioner
            for (const role of adminRoles) {
              expect(role.practitioner).toBeDefined();
              expect(role.practitioner!.reference).toBe(
                `Practitioner/${adminId}`,
              );
            }

            // Staff 1: every role should reference staff1 as practitioner
            for (const role of staff1Roles) {
              expect(role.practitioner).toBeDefined();
              expect(role.practitioner!.reference).toBe(
                `Practitioner/${staff1Id}`,
              );
            }

            // Staff 2: every role should reference staff2 as practitioner
            for (const role of staff2Roles) {
              expect(role.practitioner).toBeDefined();
              expect(role.practitioner!.reference).toBe(
                `Practitioner/${staff2Id}`,
              );
            }

            // Patient: every role should reference the patient member
            for (const role of patientRoles) {
              if (role.patient) {
                expect(role.patient.reference).toBe(
                  `Patient/${patientId}`,
                );
              }
              if (role.practitioner) {
                expect(role.practitioner.reference).toBe(
                  `Practitioner/${patientId}`,
                );
              }
            }

            // Cross-check: no member's roles contain references to other members
            const allMemberIds = [adminId, staff1Id, staff2Id, patientId];
            const memberRolesMap: Array<[string, RoleResponse[]]> = [
              [adminId, adminRoles],
              [staff1Id, staff1Roles],
              [staff2Id, staff2Roles],
              [patientId, patientRoles],
            ];

            for (const [memberId, roles] of memberRolesMap) {
              const otherIds = allMemberIds.filter((id) => id !== memberId);
              for (const role of roles) {
                for (const otherId of otherIds) {
                  if (role.practitioner) {
                    expect(role.practitioner.reference).not.toBe(
                      `Practitioner/${otherId}`,
                    );
                  }
                  if (role.patient) {
                    expect(role.patient.reference).not.toBe(
                      `Patient/${otherId}`,
                    );
                  }
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 10 ────────────────────────────────────────────────────────────

  describe('Property 10: Invitation-created role indistinguishable from direct assignment in GET response', () => {
    /**
     * **Validates: Requirements 5.3**
     *
     * For any valid practitioner role code, a healthcare role created via
     * invitation redemption (InvitationController) SHALL be indistinguishable
     * in the HealthcareRoleController GET response from a role created via
     * direct staff assignment (HealthcareRoleController), except for the
     * `createdBy` field — both SHALL have matching `roleCode`, `roleDisplay`,
     * `organization.display`, and `organization.reference`.
     */
    it('invitation-created role matches direct assignment role in GET response structural fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb.filter((code) => code !== PATIENT),
          async (orgName, adminId, directMemberId, inviteMemberId, roleCode) => {
            // Feature: org-role-integration-tests, Property 10: Invitation-created role indistinguishable from direct assignment in GET response
            fc.pre(adminId !== directMemberId);
            fc.pre(adminId !== inviteMemberId);
            fc.pre(directMemberId !== inviteMemberId);

            const { orgHandlers, roleHandlers, invHandlers } =
              createIntegrationControllers();

            // 1. Create org (admin gets auto-admin role)
            const orgId = await createOrg(orgHandlers, adminId, orgName);
            const orgRef = `Organization/${orgId}`;

            // 2. Direct staff assignment for member A
            await assignStaff(
              roleHandlers,
              adminId,
              directMemberId,
              roleCode,
              orgId,
            );

            // 3. Create invitation with the same role code, redeem for member B
            const token = await createInvitation(
              invHandlers,
              adminId,
              orgId,
              roleCode,
            );
            const redeemResult = await redeemInvitation(
              invHandlers,
              inviteMemberId,
              token,
            );
            expect(redeemResult.statusCode).toBe(201);

            // 4. GET roles for both members
            const directRoles = (await getMyRoles(
              roleHandlers,
              directMemberId,
            )) as unknown as RoleResponse[];
            const inviteRoles = (await getMyRoles(
              roleHandlers,
              inviteMemberId,
            )) as unknown as RoleResponse[];

            // Find the matching roles at this org with this role code
            const directRole = directRoles.find(
              (r) =>
                r.roleCode === roleCode &&
                r.organization.reference === orgRef,
            );
            const inviteRole = inviteRoles.find(
              (r) =>
                r.roleCode === roleCode &&
                r.organization.reference === orgRef,
            );

            expect(directRole).toBeDefined();
            expect(inviteRole).toBeDefined();

            // 5. Compare structural fields — these should be identical
            expect(inviteRole!.roleCode).toBe(directRole!.roleCode);
            expect(inviteRole!.roleDisplay).toBe(directRole!.roleDisplay);
            expect(inviteRole!.organization.display).toBe(
              directRole!.organization.display,
            );
            expect(inviteRole!.organization.reference).toBe(
              directRole!.organization.reference,
            );

            // practitioner.reference will differ (different members) — that's expected
            // createdBy may differ — that's explicitly excluded from comparison
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── Property 11 ────────────────────────────────────────────────────────────

  describe('Property 11: Organization members listing scoped to org only', () => {
    /**
     * **Validates: Requirements 5.4**
     *
     * For any set of multiple organizations with roles assigned across them,
     * the organization members listing (GET /:id/members) for each
     * organization SHALL include only roles belonging to that organization,
     * with no cross-organization leakage.
     */
    it('GET /:id/members for each org returns only roles belonging to that org', async () => {
      await fc.assert(
        fc.asyncProperty(
          orgNameArb,
          orgNameArb,
          memberIdArb,
          memberIdArb,
          memberIdArb,
          validPractitionerCodeArb,
          async (orgName1, orgName2, adminId, staff1Id, staff2Id, staffRoleCode) => {
            // Feature: org-role-integration-tests, Property 11: Organization members listing scoped to org only
            fc.pre(orgName1 !== orgName2);
            fc.pre(adminId !== staff1Id);
            fc.pre(adminId !== staff2Id);
            fc.pre(staff1Id !== staff2Id);

            const { orgHandlers, roleHandlers } =
              createIntegrationControllers();

            // 1. Create two orgs with the same admin
            const orgId1 = await createOrg(orgHandlers, adminId, orgName1);
            const orgId2 = await createOrg(orgHandlers, adminId, orgName2);

            // 2. Assign staff1 to org1, staff2 to org2
            await assignStaff(
              roleHandlers,
              adminId,
              staff1Id,
              staffRoleCode,
              orgId1,
            );
            await assignStaff(
              roleHandlers,
              adminId,
              staff2Id,
              staffRoleCode,
              orgId2,
            );

            // 3. List members for org1
            const members1Result = await orgHandlers.listOrgMembers({
              params: { id: orgId1 },
              memberContext: { memberId: adminId },
            });
            expect(members1Result.statusCode).toBe(200);

            const members1Body = members1Result.response as unknown as {
              success: boolean;
              data: Record<string, Record<string, unknown>[]>;
            };
            expect(members1Body.success).toBe(true);

            // 4. List members for org2
            const members2Result = await orgHandlers.listOrgMembers({
              params: { id: orgId2 },
              memberContext: { memberId: adminId },
            });
            expect(members2Result.statusCode).toBe(200);

            const members2Body = members2Result.response as unknown as {
              success: boolean;
              data: Record<string, Record<string, unknown>[]>;
            };
            expect(members2Body.success).toBe(true);

            // 5. Verify every role in org1's listing belongs to org1
            for (const roles of Object.values(members1Body.data)) {
              for (const role of roles) {
                expect(role['organizationId']).toBe(orgId1);
              }
            }

            // 6. Verify every role in org2's listing belongs to org2
            for (const roles of Object.values(members2Body.data)) {
              for (const role of roles) {
                expect(role['organizationId']).toBe(orgId2);
              }
            }

            // 7. Verify no cross-org leakage: staff1 should NOT appear in org2's listing
            const allOrg2MemberIds = Object.values(members2Body.data)
              .flat()
              .map((r) => r['memberId']);
            expect(allOrg2MemberIds).not.toContain(staff1Id);

            // 8. Verify no cross-org leakage: staff2 should NOT appear in org1's listing
            const allOrg1MemberIds = Object.values(members1Body.data)
              .flat()
              .map((r) => r['memberId']);
            expect(allOrg1MemberIds).not.toContain(staff2Id);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
