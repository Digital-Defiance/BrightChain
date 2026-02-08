# Requirements Document

## Introduction

This document specifies the requirements for the BrightChain Email Messaging Protocol, which extends the existing messaging system to support full email functionality compliant with RFC 5322 (Internet Message Format) and RFC 2045/2046 (MIME). The protocol enables users on different nodes to exchange email messages with standard email features (subject, CC, BCC, attachments, multi-part content, arbitrary headers) while leveraging BrightChain's distributed block storage and cross-node replication capabilities.

The system builds upon the existing `IMessageMetadata` interface, `MessageCBLService`, `MessageRouter`, and block replication infrastructure to provide a decentralized, privacy-preserving email system.

### Referenced Standards

- **RFC 5322**: Internet Message Format - defines syntax for email headers and message structure
- **RFC 2045**: MIME Part One - Format of Internet Message Bodies
- **RFC 2046**: MIME Part Two - Media Types (multipart, message subtypes)
- **RFC 2047**: MIME Part Three - Message Header Extensions for Non-ASCII Text
- **RFC 2183**: Content-Disposition Header Field
- **RFC 6532**: Internationalized Email Headers (UTF-8)

## Glossary

- **Email_Message_Service**: The service responsible for creating, storing, and retrieving email messages using the extended message structure
- **Email_Metadata**: Extended message metadata containing email-specific fields (subject, CC, BCC, headers, content-type) per RFC 5322
- **Email_Parser**: Component that parses RFC 5322 compliant email messages into structured Email_Metadata objects
- **Email_Serializer**: Component that serializes Email_Metadata objects into RFC 5322 compliant format
- **Cross_Node_Delivery_Service**: The service responsible for ensuring email blocks are replicated to recipient nodes
- **Email_Header**: A key-value pair representing standard or custom email headers per RFC 5322 Section 2.2
- **Header_Field_Name**: The name portion of a header, composed of printable US-ASCII characters (33-126) excluding colon
- **Header_Field_Body**: The value portion of a header, which may be structured or unstructured per RFC 5322
- **MIME_Entity**: A message or part of a message with its own headers and body per RFC 2045
- **MIME_Part**: A single part of a multi-part email message with its own Content-Type and body
- **MIME_Boundary**: A unique string delimiter separating parts in multipart messages per RFC 2046
- **Content_Type**: MIME header specifying media type and subtype (e.g., text/plain, multipart/mixed)
- **Content_Transfer_Encoding**: Header specifying encoding (7bit, 8bit, binary, quoted-printable, base64)
- **Content_Disposition**: Header specifying inline or attachment disposition per RFC 2183
- **Content_ID**: Header providing unique identifier for MIME parts, used for inline references
- **Attachment**: A file attached to an email, stored as blocks with filename and MIME type metadata
- **Mailbox**: An email address in the format local-part@domain per RFC 5322 Section 3.4
- **Address_List**: A comma-separated list of mailboxes or groups per RFC 5322
- **Message_ID**: Globally unique message identifier in angle brackets per RFC 5322 Section 3.6.4
- **Recipient_Node**: The BrightChain node where a recipient user's data is stored
- **Sender_Node**: The BrightChain node where the sender user's data is stored
- **Block_Replication**: The process of copying blocks from one node to another for availability
- **Email_CBL**: A Constituent Block List structure containing email content blocks and metadata
- **Delivery_Receipt**: Confirmation that email blocks have been successfully replicated to recipient node
- **Folding**: The process of breaking long header lines per RFC 5322 Section 2.2.3
- **Unfolding**: The process of reconstructing folded header lines by removing CRLF+WSP sequences

## Requirements

### Requirement 1: RFC 5322 Compliant Email Header Structure

**User Story:** As a user, I want to send and receive email messages with standard RFC 5322 compliant headers, so that my emails are interoperable with standard email conventions.

#### Acceptance Criteria

1. THE Email_Metadata SHALL include all RFC 5322 originator fields: From (required), Sender (optional), Reply-To (optional)
2. THE Email_Metadata SHALL include all RFC 5322 destination fields: To, Cc, Bcc as Address_List types
3. THE Email_Metadata SHALL include RFC 5322 identification fields: Message-ID (required, auto-generated if not provided), In-Reply-To (optional), References (optional)
4. THE Email_Metadata SHALL include RFC 5322 informational fields: Subject, Comments, Keywords
5. THE Email_Metadata SHALL include the Date field as RFC 5322 date-time format (required, auto-generated if not provided)
6. THE Email_Metadata SHALL support arbitrary extension headers (X-* headers) as key-value pairs
7. WHEN a header field name is provided, THE Email_Parser SHALL validate it contains only printable US-ASCII characters (33-126) excluding colon per RFC 5322 Section 2.2
8. THE Email_Metadata SHALL support the MIME-Version header with value "1.0" per RFC 2045
9. WHEN storing headers, THE Email_Message_Service SHALL preserve header field order as specified in the original message
10. THE Email_Metadata SHALL support multiple occurrences of headers that RFC 5322 permits to appear multiple times (Received, Resent-*, Comments, Keywords)

### Requirement 2: Email Address Format and Validation

**User Story:** As a user, I want email addresses to be validated according to RFC 5322, so that messages are addressed correctly.

#### Acceptance Criteria

1. THE Email_Parser SHALL parse mailbox addresses in the format: [display-name] "<" addr-spec ">" or addr-spec per RFC 5322 Section 3.4
2. THE Email_Parser SHALL parse addr-spec as local-part "@" domain per RFC 5322 Section 3.4.1
3. THE Email_Parser SHALL support quoted-string local-parts containing special characters per RFC 5322
4. THE Email_Parser SHALL support group addresses in the format: display-name ":" [mailbox-list] ";" per RFC 5322 Section 3.4
5. WHEN validating an email address, THE Email_Parser SHALL reject addresses exceeding 254 characters total length per RFC 5321
6. WHEN validating a local-part, THE Email_Parser SHALL reject local-parts exceeding 64 characters per RFC 5321
7. THE Email_Parser SHALL support internationalized email addresses (UTF-8) per RFC 6532 when enabled
8. IF an invalid email address is provided, THEN THE Email_Message_Service SHALL return a descriptive error with the specific validation failure

### Requirement 3: Message-ID Generation and Format

**User Story:** As a system, I want to generate globally unique Message-IDs, so that emails can be uniquely identified and threaded.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL generate Message-IDs in the format "<" id-left "@" id-right ">" per RFC 5322 Section 3.6.4
2. WHEN generating a Message-ID, THE Email_Message_Service SHALL use the sender's node ID or domain as the id-right portion
3. THE Email_Message_Service SHALL ensure Message-IDs are globally unique by incorporating timestamp, random component, and node identifier
4. THE Email_Parser SHALL validate that Message-IDs are enclosed in angle brackets
5. THE Email_Parser SHALL validate that Message-IDs contain exactly one "@" character
6. WHEN parsing In-Reply-To or References headers, THE Email_Parser SHALL extract multiple Message-IDs separated by whitespace

### Requirement 4: Subject Line Handling

**User Story:** As a user, I want to compose emails with subject lines that support international characters, so that I can communicate in any language.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL store subject lines as UTF-8 encoded strings
2. WHEN serializing, THE Email_Serializer SHALL encode non-ASCII subject characters using RFC 2047 encoded-words (=?charset?encoding?encoded-text?=)
3. THE Email_Serializer SHALL support both Base64 (B) and Quoted-Printable (Q) encoding for encoded-words
4. WHEN a subject line exceeds 78 characters, THE Email_Serializer SHALL fold it across multiple lines per RFC 5322 Section 2.2.3
5. THE Email_Parser SHALL decode RFC 2047 encoded-words in subject lines back to UTF-8
6. THE Email_Message_Service SHALL preserve the original subject encoding information for round-trip fidelity

### Requirement 5: MIME Content-Type Header

**User Story:** As a user, I want to send emails with various content types, so that I can share different types of content.

#### Acceptance Criteria

1. THE Email_Metadata SHALL include Content-Type header with type/subtype and optional parameters per RFC 2045
2. THE Email_Parser SHALL parse Content-Type parameters including charset, boundary, name, and custom parameters
3. THE Email_Parser SHALL handle quoted parameter values containing special characters per RFC 2045
4. WHEN Content-Type is not specified, THE Email_Message_Service SHALL default to "text/plain; charset=us-ascii" per RFC 2045
5. THE Email_Metadata SHALL support all discrete media types: text, image, audio, video, application
6. THE Email_Metadata SHALL support all composite media types: multipart, message
7. THE Email_Parser SHALL validate that multipart Content-Types include a boundary parameter

### Requirement 6: Multi-Part MIME Message Structure

**User Story:** As a user, I want to send emails with multiple content parts (plain text, HTML, attachments), so that I can compose rich email messages.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL support multipart/mixed for messages with attachments per RFC 2046 Section 5.1.3
2. THE Email_Message_Service SHALL support multipart/alternative for messages with multiple representations (text + HTML) per RFC 2046 Section 5.1.4
3. THE Email_Message_Service SHALL support multipart/related for messages with inline content (HTML with embedded images) per RFC 2387
4. THE Email_Message_Service SHALL support multipart/digest for collections of messages per RFC 2046 Section 5.1.5
5. WHEN creating a multipart message, THE Email_Serializer SHALL generate a unique boundary string that does not appear in any part content
6. THE Email_Serializer SHALL format multipart messages with proper boundary delimiters: "--boundary" for part separators and "--boundary--" for termination
7. THE Email_Parser SHALL correctly parse nested multipart structures (e.g., multipart/mixed containing multipart/alternative)
8. WHEN parsing multipart content, THE Email_Parser SHALL handle preamble text before the first boundary and epilogue text after the final boundary
9. THE Email_Message_Service SHALL preserve the order of parts within multipart/alternative (least preferred first, most preferred last)
10. WHEN a MIME part has no Content-Type, THE Email_Parser SHALL default to "text/plain; charset=us-ascii" for multipart parts per RFC 2046

### Requirement 7: MIME Part Headers

**User Story:** As a user, I want each part of my email to have proper headers, so that content is correctly identified and displayed.

#### Acceptance Criteria

1. THE Email_Metadata SHALL store Content-Transfer-Encoding for each MIME_Part (7bit, 8bit, binary, quoted-printable, base64)
2. THE Email_Metadata SHALL store Content-Disposition for each MIME_Part (inline or attachment) per RFC 2183
3. WHEN Content-Disposition is attachment, THE Email_Metadata SHALL include the filename parameter
4. THE Email_Metadata SHALL store Content-ID for MIME_Parts that are referenced inline (format: "<" id ">" per RFC 2045)
5. THE Email_Metadata SHALL store Content-Description as optional human-readable description per RFC 2045
6. WHEN encoding binary content, THE Email_Serializer SHALL use base64 Content-Transfer-Encoding
7. WHEN encoding text with special characters, THE Email_Serializer SHALL use quoted-printable Content-Transfer-Encoding
8. THE Email_Parser SHALL decode content based on Content-Transfer-Encoding before processing

### Requirement 8: Email Attachments

**User Story:** As a user, I want to attach files to my emails, so that I can share documents and media with recipients.

#### Acceptance Criteria

1. WHEN a file is attached to an email, THE Email_Message_Service SHALL store the attachment as separate blocks using the ExtendedCBL structure with fileName and mimeType
2. THE Email_Message_Service SHALL support multiple attachments per email message
3. WHEN storing an attachment, THE Email_Message_Service SHALL preserve the original filename, MIME type, and file size
4. THE Email_Message_Service SHALL encode attachment filenames with non-ASCII characters using RFC 2231 parameter encoding
5. THE Email_Message_Service SHALL enforce a configurable maximum attachment size limit (default: 25MB per attachment)
6. THE Email_Message_Service SHALL enforce a configurable maximum total message size limit (default: 50MB)
7. WHEN retrieving an email with attachments, THE Email_Message_Service SHALL reconstruct attachments with their original filenames and MIME types
8. IF an attachment exceeds the size limit, THEN THE Email_Message_Service SHALL reject the email creation with error code ATTACHMENT_TOO_LARGE
9. THE Email_Message_Service SHALL support inline attachments with Content-ID for HTML email embedding
10. THE Email_Message_Service SHALL calculate and store MD5 Content-MD5 header for attachment integrity verification per RFC 1864

### Requirement 9: CC and BCC Handling

**User Story:** As a user, I want to send copies of emails to additional recipients using CC and BCC, so that I can keep others informed while controlling visibility.

#### Acceptance Criteria

1. WHEN CC recipients are specified, THE Email_Message_Service SHALL include them in the Cc header visible to all recipients
2. WHEN BCC recipients are specified, THE Email_Message_Service SHALL route the message to BCC recipients but exclude them from all recipient copies
3. THE Email_Message_Service SHALL create separate encrypted copies for BCC recipients that do not contain the Bcc header
4. THE Cross_Node_Delivery_Service SHALL track delivery status independently for To, Cc, and Bcc recipients
5. WHEN replying to an email, THE Email_Message_Service SHALL include original To and Cc recipients in the reply (Reply-All behavior) but never include original Bcc recipients
6. THE Email_Message_Service SHALL support empty To field when Bcc recipients are specified (undisclosed recipients)

### Requirement 10: Email Threading and Conversation

**User Story:** As a user, I want emails to be organized into conversation threads, so that I can follow email discussions easily.

#### Acceptance Criteria

1. WHEN replying to an email, THE Email_Message_Service SHALL set the In-Reply-To header to the parent message's Message-ID
2. WHEN replying to an email, THE Email_Message_Service SHALL construct the References header by appending the parent's Message-ID to the parent's References list
3. THE Email_Message_Service SHALL limit the References header to the most recent 10-20 Message-IDs to prevent unbounded growth per RFC 5322 recommendation
4. THE Email_Message_Service SHALL provide a query to retrieve all emails in a thread by following the References chain
5. WHEN displaying a thread, THE Email_Message_Service SHALL order messages chronologically by Date header
6. THE Email_Message_Service SHALL support retrieving the root message of any thread by following References to the first Message-ID
7. THE Email_Message_Service SHALL handle broken threads where intermediate messages are missing

### Requirement 11: Cross-Node Email Delivery

**User Story:** As a user on Node A, I want to send emails to users on Node B, so that I can communicate with users across the BrightChain network.

#### Acceptance Criteria

1. WHEN an email is sent to a recipient on a different node, THE Cross_Node_Delivery_Service SHALL resolve the recipient's home node using the node registry
2. WHEN delivering cross-node email, THE Cross_Node_Delivery_Service SHALL replicate all email blocks (header block, body blocks, attachment blocks) to the recipient's node
3. THE Cross_Node_Delivery_Service SHALL use the existing GossipService to announce email blocks to the network
4. WHEN block replication is complete for a recipient, THE Cross_Node_Delivery_Service SHALL update that recipient's delivery status to DELIVERED
5. IF block replication fails after configurable retry attempts (default: 3), THEN THE Cross_Node_Delivery_Service SHALL mark the delivery status as FAILED with failure reason
6. THE Cross_Node_Delivery_Service SHALL track replication progress for each recipient independently
7. WHEN multiple recipients are on different nodes, THE Cross_Node_Delivery_Service SHALL replicate blocks to each recipient's node in parallel
8. THE Cross_Node_Delivery_Service SHALL implement exponential backoff for retry attempts (1s, 2s, 4s, ...)
9. THE Cross_Node_Delivery_Service SHALL timeout delivery attempts after configurable duration (default: 24 hours)

### Requirement 12: Email Delivery Status Tracking

**User Story:** As a sender, I want to track the delivery status of my emails, so that I know when recipients have received my messages.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL track delivery status per recipient using states: PENDING, QUEUED, IN_TRANSIT, DELIVERED, FAILED, BOUNCED, READ
2. WHEN blocks are successfully replicated to a recipient's node, THE Cross_Node_Delivery_Service SHALL generate a Delivery_Receipt with timestamp
3. THE Email_Message_Service SHALL store delivery timestamps for each recipient: queued_at, sent_at, delivered_at, read_at
4. WHEN a recipient's node acknowledges block receipt, THE Cross_Node_Delivery_Service SHALL update the delivery status to DELIVERED
5. THE Email_Message_Service SHALL support querying sent emails by delivery status
6. IF delivery fails, THEN THE Email_Message_Service SHALL preserve the failure reason, error code, and last attempt timestamp in the metadata
7. THE Email_Message_Service SHALL support Delivery Status Notification (DSN) generation per RFC 3464 format

### Requirement 13: Email Retrieval and Inbox

**User Story:** As a recipient, I want to retrieve emails sent to me, so that I can read my incoming messages.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL provide an inbox query that returns emails where the user is a recipient (To, Cc, or Bcc)
2. WHEN querying the inbox, THE Email_Message_Service SHALL return emails sorted by Date header (newest first by default)
3. THE Email_Message_Service SHALL support filtering inbox by: read/unread status, sender, date range, has_attachments, subject contains
4. THE Email_Message_Service SHALL support full-text search across email subject and body content
5. WHEN an email is retrieved, THE Email_Message_Service SHALL reconstruct the complete message including all MIME parts and attachments
6. THE Email_Message_Service SHALL support pagination for inbox queries with configurable page size (default: 50)
7. THE Email_Message_Service SHALL support sorting by: date, sender, subject, size
8. THE Email_Message_Service SHALL track and return unread count for inbox queries

### Requirement 14: Email Serialization and Parsing (Round-Trip)

**User Story:** As a developer, I want emails to be serialized and parsed in RFC 5322/MIME compliant format, so that they can be stored, transmitted, and reconstructed reliably.

#### Acceptance Criteria

1. THE Email_Serializer SHALL produce RFC 5322 compliant output with proper CRLF line endings
2. THE Email_Serializer SHALL fold header lines exceeding 78 characters at appropriate whitespace boundaries per RFC 5322 Section 2.2.3
3. THE Email_Serializer SHALL separate the header section from the body with a blank line (CRLF CRLF)
4. THE Email_Parser SHALL unfold multi-line headers by removing CRLF followed by whitespace
5. THE Email_Parser SHALL handle both CRLF and LF line endings for robustness
6. FOR ALL valid Email_Metadata objects, serializing then parsing SHALL produce an equivalent Email_Metadata object (round-trip property)
7. FOR ALL valid RFC 5322 email strings, parsing then serializing then parsing SHALL produce an equivalent Email_Metadata object
8. THE Email_Serializer SHALL encode the body according to the Content-Transfer-Encoding header
9. THE Email_Parser SHALL decode the body according to the Content-Transfer-Encoding header
10. THE Email_Message_Service SHALL store emails in a canonical internal format and serialize to RFC 5322 on demand

### Requirement 15: Email Validation

**User Story:** As a system, I want to validate email messages before storage, so that only well-formed emails are accepted.

#### Acceptance Criteria

1. WHEN an email is created, THE Email_Message_Service SHALL validate that at least one recipient (To, Cc, or Bcc) is specified
2. WHEN an email is created, THE Email_Message_Service SHALL validate that the From header contains exactly one mailbox
3. THE Email_Parser SHALL validate header field names contain only valid characters (printable US-ASCII 33-126, excluding colon)
4. THE Email_Parser SHALL validate that required headers are present: From, Date, Message-ID (auto-generated if missing)
5. IF validation fails, THEN THE Email_Message_Service SHALL return a structured error with error code, field name, and description
6. THE Email_Parser SHALL validate Content-Type headers are well-formed with valid type/subtype
7. THE Email_Parser SHALL validate that multipart messages have valid boundary parameters
8. THE Email_Parser SHALL validate that Content-Transfer-Encoding values are one of: 7bit, 8bit, binary, quoted-printable, base64
9. THE Email_Message_Service SHALL validate total message size does not exceed configured maximum
10. THE Email_Parser SHALL validate date-time format per RFC 5322 Section 3.3

### Requirement 16: Email Security and Encryption

**User Story:** As a user, I want my emails to be encrypted and private, so that only intended recipients can read them.

#### Acceptance Criteria

1. THE Email_Message_Service SHALL support end-to-end encryption using the existing MessageEncryptionScheme options (NONE, ECIES, SYMMETRIC)
2. WHEN BCC recipients are specified, THE Email_Message_Service SHALL ensure BCC addresses are cryptographically separated and not derivable from any recipient's copy
3. THE Email_Message_Service SHALL encrypt email content blocks before storage using recipient's public key
4. WHEN delivering to multiple recipients, THE Email_Message_Service SHALL create separate encrypted copies with each recipient's public key
5. THE Email_Message_Service SHALL support S/MIME signatures for sender authentication per RFC 5751
6. THE Email_Message_Service SHALL support S/MIME encryption as an alternative encryption method per RFC 5751
7. THE Email_Message_Service SHALL store encryption metadata (scheme, key IDs) in the Email_Metadata for decryption
8. WHEN decrypting an email, THE Email_Message_Service SHALL verify the sender's signature if present

### Requirement 17: Resent Headers for Forwarding

**User Story:** As a user, I want to forward emails while preserving the original message information, so that recipients know the email's history.

#### Acceptance Criteria

1. WHEN forwarding an email, THE Email_Message_Service SHALL add Resent-From, Resent-To, Resent-Date, and Resent-Message-ID headers per RFC 5322 Section 3.6.6
2. THE Email_Message_Service SHALL preserve all original headers when forwarding
3. THE Email_Parser SHALL parse Resent-* headers and distinguish them from original headers
4. WHEN multiple forwards occur, THE Email_Message_Service SHALL prepend new Resent-* header blocks (most recent first)
5. THE Email_Message_Service SHALL support Resent-Cc and Resent-Bcc headers for forwarding to multiple recipients
