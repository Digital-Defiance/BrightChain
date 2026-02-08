# Implementation Plan: Email Messaging Protocol

## Overview

This implementation plan extends the existing BrightChain messaging infrastructure to support RFC 5322/MIME compliant email functionality. The implementation uses TypeScript and builds on the existing `MessageCBLService`, `MessageRouter`, and block replication infrastructure.

## Required Dependencies

Before starting implementation, add the following npm packages:

```bash
# Email parsing (RFC 822/5322 compliant)
yarn add postal-mime

# Email serialization (RFC 5322 compliant message generation)
yarn add mimetext

# Email address parsing (RFC 5322 address grammar)
yarn add email-addresses
yarn add -D @types/email-addresses
```

Note: `validator` and `fast-check` are already in the project dependencies.

## Tasks

- [ ] 0. Install required dependencies
  - Add postal-mime, mimetext, and email-addresses packages
  - Verify TypeScript types are available
  - Run `yarn install` to update lock file

- [ ] 1. Create email interfaces and types
  - [ ] 1.1 Create IEmailMetadata interface extending IMessageMetadata
    - Define all RFC 5322 header fields (from, to, cc, bcc, subject, date, messageId, etc.)
    - Define MIME-related fields (contentType, parts, attachments)
    - Define delivery tracking fields
    - Create in `brightchain-lib/src/lib/interfaces/messaging/emailMetadata.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 1.2 Create IMailbox and IAddress interfaces
    - Define IMailbox with displayName, localPart, domain
    - Define IAddressGroup for group addresses
    - Create address utility functions
    - Create in `brightchain-lib/src/lib/interfaces/messaging/emailAddress.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 1.3 Create IContentType and IMimePart interfaces
    - Define Content-Type structure with type, subtype, parameters
    - Define ContentTransferEncoding enum
    - Define IMimePart with nested part support
    - Define IContentDisposition interface
    - Create in `brightchain-lib/src/lib/interfaces/messaging/mimePart.ts`
    - _Requirements: 5.1, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [ ] 1.4 Create IAttachmentMetadata interface
    - Define attachment storage reference with CBL magnet URL
    - Define integrity fields (checksum, contentMd5)
    - Create in `brightchain-lib/src/lib/interfaces/messaging/attachmentMetadata.ts`
    - _Requirements: 8.1, 8.3, 8.10_

  - [ ] 1.5 Create EmailDeliveryStatus enum and IDeliveryReceipt interface
    - Define delivery status states (PENDING, QUEUED, IN_TRANSIT, DELIVERED, FAILED, BOUNCED, READ)
    - Define delivery receipt with timestamps and failure info
    - Create in `brightchain-lib/src/lib/interfaces/messaging/emailDelivery.ts`
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 1.6 Create EmailErrorType enum and EmailError class
    - Define all error types for validation, parsing, delivery, storage
    - Create EmailError class extending Error
    - Create in `brightchain-lib/src/lib/errors/messaging/emailError.ts`
    - _Requirements: 15.5_

- [ ] 2. Implement EmailValidator
  - [ ] 2.1 Implement header validation methods
    - Implement validateHeaderName() for RFC 5322 character validation
    - Implement validateMailbox() using `email-addresses` library for address format validation
    - Implement validateMessageId() for Message-ID format
    - Implement validateDate() for RFC 5322 date format
    - Use `validator.isEmail()` for basic email format validation
    - Create in `brightchain-lib/src/lib/services/messaging/emailValidator.ts`
    - _Requirements: 1.7, 15.2, 15.3, 15.4, 15.10_

  - [ ] 2.2 Write property test for header name validation
    - **Property 8: Header Name Validation**
    - **Validates: Requirements 1.7, 15.3**

  - [ ] 2.3 Implement address length validation
    - Validate total address length <= 254 characters
    - Validate local-part length <= 64 characters
    - _Requirements: 2.5, 2.6_

  - [ ] 2.4 Write property test for address length validation
    - **Property 9: Address Length Validation**
    - **Validates: Requirements 2.5, 2.6**

  - [ ] 2.5 Implement content validation methods
    - Implement validateContentType() for MIME type validation
    - Implement validateMultipartBoundary() for boundary validation
    - Implement validateContentTransferEncoding() for encoding validation
    - _Requirements: 15.6, 15.7, 15.8_

  - [ ] 2.6 Implement size validation methods
    - Implement validateAttachmentSize() with configurable limit
    - Implement validateMessageSize() with configurable limit
    - _Requirements: 8.5, 8.6, 15.9_

  - [ ] 2.7 Write property test for size limit enforcement
    - **Property 10: Size Limit Enforcement**
    - **Validates: Requirements 8.5, 8.6, 8.8, 15.9**

  - [ ] 2.8 Implement full email validation
    - Implement validate() method combining all validations
    - Return structured IValidationResult with error details
    - _Requirements: 15.1, 15.5_

- [ ] 3. Checkpoint - Ensure all validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement EmailParser
  - [ ] 4.1 Implement header parsing methods
    - Create EmailParser class that wraps `postal-mime` library
    - Implement parseHeaders() using postal-mime's header extraction
    - Implement unfoldHeaders() to handle multi-line headers (postal-mime handles this internally)
    - Implement parseMailbox() and parseAddressList() using `email-addresses` library
    - Implement parseMessageId() for Message-ID extraction
    - Implement parseDate() for RFC 5322 date parsing
    - Create in `brightchain-lib/src/lib/services/messaging/emailParser.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4, 3.5, 3.6, 14.4_

  - [ ] 4.2 Write property test for address parsing round-trip
    - **Property 2: Address Parsing Round-Trip**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ] 4.3 Implement Content-Type parsing
    - Implement parseContentType() with parameter extraction
    - Handle quoted parameter values
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 4.4 Implement body decoding methods
    - Leverage postal-mime's built-in decoding for quoted-printable and base64
    - Implement decodeEncodedWord() wrapper for RFC 2047 encoded-words (postal-mime handles this)
    - Add utility methods for manual decoding when needed
    - _Requirements: 4.5, 7.8, 14.9_

  - [ ] 4.5 Implement multipart parsing
    - Use postal-mime's multipart parsing capabilities
    - Convert postal-mime's attachment/part structure to IMimePart[]
    - Handle preamble and epilogue text
    - Support nested multipart structures
    - _Requirements: 6.7, 6.8_

  - [ ] 4.6 Implement main parse() method
    - Use `PostalMime.parse()` as the core parsing engine
    - Convert postal-mime's Email type to IEmailMetadata
    - Handle both CRLF and LF line endings (postal-mime handles this)
    - _Requirements: 14.5_

- [ ] 5. Implement EmailSerializer
  - [ ] 5.1 Implement header serialization methods
    - Create EmailSerializer class that wraps `mimetext` library
    - Implement serializeHeaders() using mimetext's header handling
    - Implement foldHeader() for line folding at 78 characters (mimetext handles this automatically)
    - Implement serializeMailbox() and serializeAddressList() using mimetext's address formatting
    - Implement serializeMessageId() and serializeDate()
    - Create in `brightchain-lib/src/lib/services/messaging/emailSerializer.ts`
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 5.2 Write property test for header folding/unfolding inverse
    - **Property 14: Header Folding/Unfolding Inverse**
    - **Validates: Requirements 14.2, 14.4**

  - [ ] 5.3 Implement body encoding methods
    - Use mimetext's built-in encoding for quoted-printable and base64
    - Implement encodeEncodedWord() wrapper for RFC 2047 subject encoding (mimetext handles this)
    - Add utility methods for manual encoding when needed
    - _Requirements: 4.2, 4.3, 7.6, 7.7, 14.8_

  - [ ] 5.4 Write property test for Content-Transfer-Encoding consistency
    - **Property 13: Content-Transfer-Encoding Consistency**
    - **Validates: Requirements 7.6, 7.8, 14.8, 14.9**

  - [ ] 5.5 Implement multipart serialization
    - Use mimetext's `addMessage()` and `addAttachment()` for multipart construction
    - Leverage mimetext's automatic boundary generation (generateBoundary())
    - Implement serializeMultipart() wrapper with proper delimiters
    - _Requirements: 6.5, 6.6_

  - [ ] 5.6 Write property test for multipart boundary uniqueness
    - **Property 4: Multipart Boundary Uniqueness**
    - **Validates: Requirements 6.5**

  - [ ] 5.7 Implement main serialize() method
    - Use `createMimeMessage()` from mimetext as the core serialization engine
    - Convert IEmailMetadata to mimetext's message format
    - Use `msg.asRaw()` to produce RFC 5322 compliant output with CRLF
    - _Requirements: 14.1_

- [ ] 6. Checkpoint - Ensure parser and serializer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement round-trip property tests
  - [ ] 7.1 Write property test for email metadata round-trip
    - **Property 1: Email Metadata Round-Trip**
    - **Validates: Requirements 14.6, 14.7, 4.6, 7.1-7.8, 1.1-1.6**

- [ ] 8. Implement EmailMessageService core operations
  - [ ] 8.1 Create EmailMessageService class structure
    - Define constructor with dependencies (MessageCBLService, MessageRouter, etc.)
    - Define configuration interface IEmailServiceConfig
    - Create in `brightchain-lib/src/lib/services/messaging/emailMessageService.ts`
    - _Requirements: 1.1-1.10_

  - [ ] 8.2 Implement Message-ID generation
    - Generate unique Message-IDs with format <id-left@id-right>
    - Include timestamp, random component, and node identifier
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 8.3 Write property test for Message-ID uniqueness and format
    - **Property 3: Message-ID Uniqueness and Format**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ] 8.4 Implement sendEmail() method
    - Validate email using EmailValidator
    - Auto-generate required headers (From, Date, Message-ID) if missing
    - Store email using MessageCBLService
    - Initiate delivery to recipients
    - _Requirements: 15.1, 15.4_

  - [ ] 8.5 Write property test for required header auto-generation
    - **Property 15: Required Header Auto-Generation**
    - **Validates: Requirements 1.3, 1.5, 15.4**

  - [ ] 8.6 Implement getEmail() and getEmailContent() methods
    - Retrieve email metadata by messageId
    - Reconstruct complete email with all MIME parts
    - _Requirements: 13.5_

  - [ ] 8.7 Implement attachment storage
    - Store attachments as ExtendedCBL blocks
    - Preserve filename, MIME type, and calculate checksums
    - _Requirements: 8.1, 8.2, 8.3, 8.9, 8.10_

  - [ ] 8.8 Write property test for attachment round-trip
    - **Property 6: Attachment Round-Trip**
    - **Validates: Requirements 8.1, 8.3, 8.7**

- [ ] 9. Implement CC/BCC handling
  - [ ] 9.1 Implement BCC privacy handling
    - Create separate copies for BCC recipients without Bcc header
    - Encrypt BCC copies separately with each recipient's key
    - _Requirements: 9.2, 9.3_

  - [ ] 9.2 Write property test for BCC privacy invariant
    - **Property 5: BCC Privacy Invariant**
    - **Validates: Requirements 9.2, 9.3, 16.2**

  - [ ] 9.3 Implement CC visibility
    - Include CC recipients in Cc header for all recipients
    - _Requirements: 9.1_

  - [ ] 9.4 Implement undisclosed recipients support
    - Support empty To field when only Bcc recipients specified
    - _Requirements: 9.6_

- [ ] 10. Checkpoint - Ensure core email operations pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement email threading
  - [ ] 11.1 Implement createReply() method
    - Set In-Reply-To to parent Message-ID
    - Construct References header from parent
    - Limit References to 20 Message-IDs
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 11.2 Write property test for threading consistency
    - **Property 7: Threading Consistency**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [ ] 11.3 Implement getThread() method
    - Retrieve all emails in thread by following References
    - Order messages chronologically
    - Handle broken threads with missing messages
    - _Requirements: 10.4, 10.5, 10.7_

  - [ ] 11.4 Implement getRootMessage() method
    - Follow References to find first Message-ID
    - _Requirements: 10.6_

  - [ ] 11.5 Implement forwardEmail() method
    - Add Resent-* headers per RFC 5322
    - Preserve original headers
    - Support multiple forwards with proper ordering
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 12. Implement inbox operations
  - [ ] 12.1 Implement queryInbox() method
    - Return emails where user is To, Cc, or Bcc recipient
    - Support sorting by date, sender, subject, size
    - Support pagination with configurable page size
    - _Requirements: 13.1, 13.2, 13.6, 13.7_

  - [ ] 12.2 Write property test for inbox query correctness
    - **Property 12: Inbox Query Correctness**
    - **Validates: Requirements 13.1**

  - [ ] 12.3 Implement inbox filtering
    - Filter by read/unread status
    - Filter by sender
    - Filter by date range
    - Filter by has_attachments
    - Filter by subject contains
    - _Requirements: 13.3_

  - [ ] 12.4 Implement full-text search
    - Search across subject and body content
    - _Requirements: 13.4_

  - [ ] 12.5 Implement markAsRead() and getUnreadCount()
    - Track read status per user
    - Return accurate unread count
    - _Requirements: 13.8_

- [ ] 13. Checkpoint - Ensure inbox operations pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement CrossNodeDeliveryService
  - [ ] 14.1 Create CrossNodeDeliveryService class
    - Define constructor with GossipService, DiscoveryProtocol, BlockStore, NodeRegistry
    - Define IDeliveryConfig interface
    - Create in `brightchain-api-lib/src/lib/services/crossNodeDeliveryService.ts`
    - _Requirements: 11.1_

  - [ ] 14.2 Implement deliverToRecipients() method
    - Resolve recipient home nodes using node registry
    - Replicate all email blocks to recipient nodes
    - Track delivery status per recipient
    - _Requirements: 11.1, 11.2, 11.6_

  - [ ] 14.3 Implement replicateBlocksToNode() method
    - Use GossipService to announce blocks
    - Wait for replication confirmation
    - _Requirements: 11.3_

  - [ ] 14.4 Implement delivery status tracking
    - Update status on replication completion
    - Handle failures with retry logic
    - Implement exponential backoff
    - _Requirements: 11.4, 11.5, 11.8_

  - [ ] 14.5 Write property test for delivery status state machine
    - **Property 11: Delivery Status State Machine**
    - **Validates: Requirements 12.1, 12.4**

  - [ ] 14.6 Implement delivery receipt handling
    - Generate receipts on successful delivery
    - Handle read receipts
    - Store timestamps
    - _Requirements: 12.2, 12.3, 12.6_

  - [ ] 14.7 Implement DSN generation
    - Generate Delivery Status Notifications per RFC 3464
    - _Requirements: 12.7_

- [ ] 15. Implement email encryption
  - [ ] 15.1 Implement encryption for email content
    - Encrypt content blocks using recipient's public key
    - Support ECIES and SYMMETRIC encryption schemes
    - _Requirements: 16.1, 16.3_

  - [ ] 15.2 Implement per-recipient encryption
    - Create separate encrypted copies for each recipient
    - Store encryption metadata in Email_Metadata
    - _Requirements: 16.4, 16.7_

  - [ ] 15.3 Implement S/MIME signature support
    - Sign emails with sender's private key
    - Verify signatures on decryption
    - _Requirements: 16.5, 16.8_

  - [ ] 15.4 Implement S/MIME encryption support
    - Support S/MIME as alternative encryption method
    - _Requirements: 16.6_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Integration and wiring
  - [ ] 17.1 Create email module exports
    - Export all interfaces from brightchain-lib
    - Export all services from brightchain-lib and brightchain-api-lib
    - Update package index files

  - [ ] 17.2 Integrate with existing MessagePassingService
    - Add email-specific methods to MessagePassingService
    - Wire EmailMessageService with existing infrastructure

  - [ ] 17.3 Write integration tests
    - Test end-to-end email send/receive flow
    - Test cross-node delivery simulation
    - Test attachment handling

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript and builds on existing brightchain-lib infrastructure

### Library Usage Summary

| Component | Library | Purpose |
|-----------|---------|---------|
| EmailParser | `postal-mime` | RFC 822/5322 email parsing |
| EmailSerializer | `mimetext` | RFC 5322 email generation |
| Address Parsing | `email-addresses` | RFC 5322 address grammar parsing |
| Address Validation | `validator` | Email format validation |
| Property Testing | `fast-check` | Property-based testing |

### Why Use Libraries?

1. **RFC Compliance**: These libraries are battle-tested for RFC compliance
2. **Reduced Development Time**: Focus on BrightChain-specific features (CBL storage, encryption, delivery)
3. **Maintainability**: Library updates bring bug fixes and security patches
4. **Type Safety**: All recommended libraries have TypeScript definitions
