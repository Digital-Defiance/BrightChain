# Tasks

## Phase 1: ecies-lib Changes (upstream, minor version bump)

- [x] 1. Widen `Member.encryptData` return type from `Promise<Uint8Array>` to `Promise<Uint8Array> | Uint8Array` in `ecies-lib/src/member.ts`
  - Requirements: R1-AC7, R7-AC1, R5-AC2
- [x] 2. Widen `Member.decryptData` return type from `Promise<Uint8Array>` to `Promise<Uint8Array> | Uint8Array` in `ecies-lib/src/member.ts`
  - Requirements: R1-AC8, R7-AC2, R5-AC2
- [x] 3. Optionally change `_eciesService`, `_publicKey`, `_idBytes`, `_creatorIdBytes` from `private` to `protected` in `ecies-lib/src/member.ts` (or use public getter + Buffer.from approach)
  - Requirements: R2-AC1
- [x] 4. Verify all existing ecies-lib unit tests pass after the return type widening
  - Requirements: R5-AC4
- [x] 5. Bump ecies-lib version to 4.20.0 (minor, non-breaking)
  - Requirements: R8-AC1

- [x] 6. Publish ecies-lib

## Phase 2: node-ecies-lib Changes (upstream, minor version bump)

- [x] 6. Make `IMember` in `node-ecies-lib/src/interfaces/member.ts` extend `IMember` from `@digitaldefiance/ecies-lib` with narrowed Buffer types and added `constants`, `getPublicKeyString()`, `getIdString()`
  - Requirements: R1-AC1, R1-AC2, R1-AC3, R1-AC4, R1-AC5, R1-AC6, R1-AC9
- [x] 7. Make `Member` class in `node-ecies-lib/src/member.ts` extend `Member` from `@digitaldefiance/ecies-lib`
  - Requirements: R2-AC1, R2-AC2
- [x] 8. Remove duplicated fields from Node_Member that are now inherited from Base_Member
  - Requirements: R2-AC1
- [x] 9. Override `encryptData` to return `Buffer` synchronously (covariant with base `Promise<Uint8Array> | Uint8Array`)
  - Requirements: R2-AC3, R7-AC3, R5-AC5
- [x] 10. Override `decryptData` to return `Buffer` synchronously (covariant with base `Promise<Uint8Array> | Uint8Array`)
  - Requirements: R2-AC4, R7-AC4, R5-AC6
- [x] 11. Add/preserve `constants` getter, `getPublicKeyString()`, `getIdString()` methods
  - Requirements: R2-AC5, R2-AC6, R2-AC7
- [x] 12. Override `publicKey`, `idBytes`, `creatorIdBytes` getters to return `Buffer`
  - Requirements: R2-AC8
- [x] 13. Override static factory methods (`newMember`, `fromMnemonic`, `fromJson`, `newMemberWithTypedId`) to return `Node_Member`
  - Requirements: R2-AC9
- [x] 14. Handle ECIESService compatibility in constructor — pass Node_ECIESService to Base_Member constructor via structural typing or adapter
  - Requirements: R4-AC1, R4-AC2, R4-AC3, R4-AC4
- [x] 15. Verify `Node_PlatformID` is a superset of `Base_PlatformID` (already the case per current type definitions)
  - Requirements: R3-AC1, R3-AC2
- [x] 16. Add unit test: `new Node_Member(...) instanceof BaseMember` returns `true`
  - Requirements: R9-AC1, R9-AC3
- [x] 17. Add unit test: `new BaseMember(...) instanceof Node_Member` returns `false`
  - Requirements: R9-AC2
- [x] 18. Verify all existing node-ecies-lib unit tests pass
  - Requirements: R5-AC1, R5-AC3
- [x] 19. Add peer dependency on `@digitaldefiance/ecies-lib >= 4.20.0`
  - Requirements: R8-AC3
- [x] 20. Bump node-ecies-lib version to 4.20.0 (minor, non-breaking)
  - Requirements: R8-AC2

- [x] 21. Publish node-ecies-lib

## Phase 3: BrightChain Workspace Changes

- [x] 21. Update `@digitaldefiance/ecies-lib` and `@digitaldefiance/node-ecies-lib` dependency versions to `^4.20.0` in workspace `package.json`
  - Requirements: R8-AC4
- [x] 22. Remove `as unknown as Member<TID>` cast in `brightchain-api-lib/src/lib/services/backupCodeService.ts`
  - Requirements: R6-AC3
- [x] 23. Remove `as unknown as Member<TID>` cast in `brightchain-api-lib/src/lib/services/brightChainBackupCodeService.ts`
  - Requirements: R6-AC4
- [x] 24. Verify `MemberStore.getMember()` return type is compatible with `BackupCode.encryptBackupCodes()` parameter type (may require MemberStore generic refactor or instanceof narrowing)
  - Requirements: R6-AC1, R6-AC2
- [x] 25. Fix `Uint8Array` not assignable to `Buffer` error in `brightChainBackupCodeService.ts:257` (should resolve naturally once systemUser is typed as Node_Member)
  - Requirements: R3-AC3, R3-AC4
- [x] 26. Verify brightchain-api-lib builds without errors
  - Requirements: R5-AC1, R5-AC2
- [x] 27. Run full e2e test suite to confirm no regressions
  - Requirements: R5-AC3, R5-AC4
