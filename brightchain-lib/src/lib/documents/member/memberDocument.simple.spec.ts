import { EmailString, Member } from '@digitaldefiance/ecies-lib';
import MemberType from '../../enumerations/memberType';
import { ServiceProvider } from '../../services/service.provider';
import { MemberDocument } from './memberDocument';

describe('MemberDocument Simple Test', () => {
  it('should create a basic member document using factory method', async () => {
    // Initialize service provider
    ServiceProvider.getInstance();
    const eciesService = ServiceProvider.getInstance().eciesService;
    const idProvider = ServiceProvider.getInstance().idProvider;

    // Create test members
    const { member: publicMember } = Member.newMember(
      eciesService,
      MemberType.User,
      'testuser',
      new EmailString('test@example.com'),
    );
    const { member: privateMember } = Member.newMember(
      eciesService,
      MemberType.User,
      'testuser-private',
      new EmailString('private@example.com'),
    );

    // Create document using factory method
    const doc = MemberDocument.create(publicMember, privateMember);

    expect(doc).toBeInstanceOf(MemberDocument);
    expect(doc.id).toBe(idProvider.idToString(publicMember.id));
    expect(doc.name).toBe(publicMember.name);
    expect(doc.type).toBe(publicMember.type);
  });
});
