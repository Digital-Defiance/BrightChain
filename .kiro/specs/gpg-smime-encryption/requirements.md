# Requirements Document

## Introduction

BrightMail currently supports ECIES (RECIPIENT_KEYS) encryption for internal BrightChain recipients and has stub-level S/MIME support. This feature adds full GPG (OpenPGP) and S/MIME encryption and signing capabilities, enabling users to securely communicate with both internal and external recipients using industry-standard cryptographic protocols. The feature spans key/certificate management in user settings, encryption/decryption and signing/verification in the messaging service layer, and conditional encryption option display in the compose UI.

## Glossary

- **GPG_Key_Manager**: The service component in brightchain-lib responsible for generating, importing, exporting, and deleting GPG (OpenPGP) keypairs.
- **SMIME_Certificate_Manager**: The service component in brightchain-lib responsible for importing, validating, viewing, and deleting S/MIME X.509 certificates and associated private keys.
- **Email_Encryption_Service**: The existing `EmailEncryptionService` in brightchain-lib that handles message encryption, decryption, signing, and verification operations.
- **Encryption_Selector**: The React component in brightmail-react-components that presents available encryption scheme options in the compose UI.
- **Key_Management_Settings**: The React component in brightmail-react-components that provides the user interface for managing GPG keys and S/MIME certificates.
- **Key_Store**: The persistent storage layer (backend) that stores GPG keypairs and S/MIME certificates associated with a user account.
- **Message_Encryption_Scheme**: The `MessageEncryptionScheme` enum in brightchain-lib that defines available encryption schemes (NONE, SHARED_KEY, RECIPIENT_KEYS, S_MIME, and the new GPG value).
- **Compose_View**: The email compose UI in brightmail-react-components where users draft and send messages.
- **User_Settings_Page**: The user settings page in brightchain-react where users manage account preferences including encryption keys.
- **Recipient_Key_Resolver**: The service component that looks up a recipient's available public keys or certificates (GPG, S/MIME, or ECIES) to determine which encryption schemes are available for a given message.
- **Keyserver**: An external or BrightChain-network service that hosts GPG public keys for discovery and retrieval.
- **ASCII_Armor**: The text-based encoding format for GPG keys and signatures using PGP header/footer markers.
- **PEM**: The text-based encoding format for X.509 certificates using BEGIN/END CERTIFICATE markers.

## Requirements

### Requirement 1: GPG Keypair Generation

**User Story:** As a BrightMail user, I want to generate a GPG keypair from within user settings, so that I can encrypt and sign messages using GPG without needing external tools.

#### Acceptance Criteria

1. WHEN the user requests GPG keypair generation, THE GPG_Key_Manager SHALL generate an OpenPGP-compliant keypair containing a user ID derived from the user's display name and email address.
2. WHEN the GPG_Key_Manager generates a keypair, THE Key_Store SHALL persist both the private key (encrypted at rest) and the public key associated with the user's account.
3. WHEN keypair generation completes, THE Key_Management_Settings SHALL display the new key's metadata including key ID, fingerprint, creation date, and associated user ID.
4. IF keypair generation fails due to a cryptographic error, THEN THE GPG_Key_Manager SHALL return a descriptive error message identifying the failure reason.
5. WHEN the user has an existing GPG keypair stored, THE Key_Management_Settings SHALL display the existing key metadata and offer options to export the public key or delete the keypair.

### Requirement 2: GPG Public Key Publishing and Import

**User Story:** As a BrightMail user, I want to publish my GPG public key and import other users' public keys, so that I can exchange encrypted messages with GPG-capable contacts.

#### Acceptance Criteria

1. WHEN the user requests to publish a GPG public key, THE GPG_Key_Manager SHALL export the public key in ASCII_Armor format and submit it to the configured Keyserver.
2. WHEN the user requests to import a GPG public key from a file, THE GPG_Key_Manager SHALL validate that the file contains a well-formed ASCII-armored PGP public key block before storing it.
3. WHEN the user requests to import a GPG public key by email address, THE Recipient_Key_Resolver SHALL query the configured Keyserver for public keys matching the specified email address.
4. IF the imported GPG public key file is malformed or empty, THEN THE GPG_Key_Manager SHALL reject the import and return an error message stating the validation failure.
5. WHEN a GPG public key is successfully imported, THE Key_Store SHALL associate the imported key with the corresponding contact's email address.
6. WHEN the user requests to export a GPG public key, THE GPG_Key_Manager SHALL produce the key in ASCII_Armor format suitable for file download.

### Requirement 3: GPG Message Encryption

**User Story:** As a BrightMail user, I want to encrypt outgoing messages with GPG when the recipient's public key is available, so that only the intended recipient can read the message content.

#### Acceptance Criteria

1. WHEN the user selects GPG encryption and all recipients have GPG public keys available, THE Email_Encryption_Service SHALL encrypt the message content using each recipient's GPG public key per the OpenPGP standard.
2. WHEN the user selects GPG encryption and one or more recipients lack a GPG public key, THE Compose_View SHALL display a warning listing the recipients without available GPG keys.
3. THE Email_Encryption_Service SHALL set the Message_Encryption_Scheme to GPG on the message metadata for GPG-encrypted messages.
4. WHEN a GPG-encrypted message is sent, THE Email_Encryption_Service SHALL produce output conforming to the OpenPGP message format (RFC 4880).
5. IF GPG encryption fails for a recipient due to an invalid or expired public key, THEN THE Email_Encryption_Service SHALL return an error identifying the affected recipient and the failure reason.

### Requirement 4: GPG Message Signing

**User Story:** As a BrightMail user, I want to sign outgoing messages with my GPG private key, so that recipients can verify the message originated from me and was not tampered with.

#### Acceptance Criteria

1. WHEN the user enables GPG signing and has a GPG private key available, THE Email_Encryption_Service SHALL produce a detached OpenPGP signature over the message content.
2. WHEN the user enables both GPG signing and GPG encryption, THE Email_Encryption_Service SHALL sign the message before encrypting it.
3. IF the user enables GPG signing but has no GPG private key configured, THEN THE Compose_View SHALL display a warning directing the user to generate or import a GPG keypair in settings.
4. THE Email_Encryption_Service SHALL attach the GPG signature to the outgoing message in a format compatible with OpenPGP-aware mail clients (multipart/signed per RFC 3156).

### Requirement 5: GPG Decryption and Signature Verification

**User Story:** As a BrightMail user, I want to decrypt incoming GPG-encrypted messages and verify GPG signatures, so that I can read encrypted messages and confirm sender authenticity.

#### Acceptance Criteria

1. WHEN an incoming message has Message_Encryption_Scheme set to GPG, THE Email_Encryption_Service SHALL decrypt the message content using the recipient's GPG private key from the Key_Store.
2. WHEN an incoming message contains an OpenPGP signature, THE Email_Encryption_Service SHALL verify the signature against the sender's GPG public key from the Key_Store.
3. WHEN GPG signature verification succeeds, THE Email_Encryption_Service SHALL return a verification result containing the signer's key ID and a valid status.
4. WHEN GPG signature verification fails due to a tampered message or unknown signer key, THE Email_Encryption_Service SHALL return a verification result containing an invalid status and the failure reason.
5. IF the recipient's GPG private key is not available in the Key_Store for decryption, THEN THE Email_Encryption_Service SHALL return an error indicating the required private key is missing.

### Requirement 6: S/MIME Certificate Import and Management

**User Story:** As a BrightMail user, I want to import and manage S/MIME certificates in user settings, so that I can use S/MIME encryption and signing for my messages.

#### Acceptance Criteria

1. WHEN the user uploads an S/MIME certificate file, THE SMIME_Certificate_Manager SHALL validate that the file contains a well-formed X.509 certificate in PEM or DER format.
2. WHEN the user uploads an S/MIME certificate with an associated private key (PKCS#12 / .p12 / .pfx), THE SMIME_Certificate_Manager SHALL extract and store both the certificate and the private key (encrypted at rest).
3. WHEN an S/MIME certificate is successfully imported, THE Key_Management_Settings SHALL display the certificate metadata including subject, issuer, serial number, validity period, and associated email addresses.
4. IF the uploaded S/MIME certificate is expired, THEN THE SMIME_Certificate_Manager SHALL accept the import but THE Key_Management_Settings SHALL display a warning indicating the certificate has expired.
5. IF the uploaded file is not a valid X.509 certificate, THEN THE SMIME_Certificate_Manager SHALL reject the import and return an error message stating the validation failure.
6. WHEN the user requests to delete an S/MIME certificate, THE Key_Store SHALL remove the certificate and associated private key from the user's account.
7. WHEN the user requests to import an S/MIME certificate from another user or CA, THE SMIME_Certificate_Manager SHALL validate and store the certificate as a trusted contact certificate associated with the sender's email address.

### Requirement 7: S/MIME Message Encryption

**User Story:** As a BrightMail user, I want to encrypt outgoing messages with S/MIME when the recipient's certificate is available, so that only the intended recipient can read the message content.

#### Acceptance Criteria

1. WHEN the user selects S/MIME encryption and all recipients have S/MIME certificates available, THE Email_Encryption_Service SHALL encrypt the message content using each recipient's X.509 public key per the CMS/PKCS#7 standard (RFC 5751).
2. WHEN the user selects S/MIME encryption and one or more recipients lack an S/MIME certificate, THE Compose_View SHALL display a warning listing the recipients without available certificates.
3. WHEN an S/MIME-encrypted message is sent, THE Email_Encryption_Service SHALL produce output conforming to the S/MIME message format (application/pkcs7-mime).
4. IF S/MIME encryption fails for a recipient due to an invalid or expired certificate, THEN THE Email_Encryption_Service SHALL return an error identifying the affected recipient and the failure reason.

### Requirement 8: S/MIME Message Signing

**User Story:** As a BrightMail user, I want to sign outgoing messages with my S/MIME certificate and private key, so that recipients can verify the message originated from me.

#### Acceptance Criteria

1. WHEN the user enables S/MIME signing and has an S/MIME certificate with private key available, THE Email_Encryption_Service SHALL produce a CMS detached signature over the message content.
2. WHEN the user enables both S/MIME signing and S/MIME encryption, THE Email_Encryption_Service SHALL sign the message before encrypting it.
3. IF the user enables S/MIME signing but has no S/MIME certificate with private key configured, THEN THE Compose_View SHALL display a warning directing the user to import an S/MIME certificate in settings.
4. THE Email_Encryption_Service SHALL attach the S/MIME signature to the outgoing message in multipart/signed format per RFC 5751.

### Requirement 9: S/MIME Decryption and Signature Verification

**User Story:** As a BrightMail user, I want to decrypt incoming S/MIME-encrypted messages and verify S/MIME signatures, so that I can read encrypted messages and confirm sender authenticity.

#### Acceptance Criteria

1. WHEN an incoming message has Message_Encryption_Scheme set to S_MIME, THE Email_Encryption_Service SHALL decrypt the message content using the recipient's S/MIME private key from the Key_Store.
2. WHEN an incoming message contains an S/MIME signature, THE Email_Encryption_Service SHALL verify the signature against the sender's S/MIME certificate from the Key_Store.
3. WHEN S/MIME signature verification succeeds, THE Email_Encryption_Service SHALL return a verification result containing the signer's certificate subject and a valid status.
4. WHEN S/MIME signature verification fails due to a tampered message, expired certificate, or unknown signer, THE Email_Encryption_Service SHALL return a verification result containing an invalid status and the failure reason.
5. IF the recipient's S/MIME private key is not available in the Key_Store for decryption, THEN THE Email_Encryption_Service SHALL return an error indicating the required private key is missing.

### Requirement 10: Message Encryption Scheme Enum Extension

**User Story:** As a developer, I want the MessageEncryptionScheme enum to include a GPG value, so that the system can distinguish GPG-encrypted messages from other encryption types.

#### Acceptance Criteria

1. THE Message_Encryption_Scheme SHALL include a GPG value with the string representation `'gpg'`.
2. THE Message_Encryption_Scheme SHALL retain all existing values (NONE, SHARED_KEY, RECIPIENT_KEYS, S_MIME) without modification.
3. WHEN the API receives an encryption scheme value, THE email controller SHALL validate the value against the complete set of Message_Encryption_Scheme values including GPG.

### Requirement 11: Compose UI Encryption Selector Enhancement

**User Story:** As a BrightMail user, I want the compose encryption selector to conditionally show GPG and S/MIME options based on my configured keys and certificates, so that I only see encryption options I can actually use.

#### Acceptance Criteria

1. WHEN the user has a GPG keypair configured, THE Encryption_Selector SHALL include GPG as an available encryption option.
2. WHEN the user does not have a GPG keypair configured, THE Encryption_Selector SHALL omit GPG from the available encryption options.
3. WHEN the user has an S/MIME certificate with private key configured, THE Encryption_Selector SHALL include S/MIME as an available encryption option.
4. WHEN the user does not have an S/MIME certificate with private key configured, THE Encryption_Selector SHALL omit S/MIME from the available encryption options.
5. THE Encryption_Selector SHALL always include ECIES (RECIPIENT_KEYS) as an available option for internal BrightChain recipients.
6. THE Encryption_Selector SHALL always include the NONE option.
7. WHEN the user selects GPG or S/MIME encryption, THE Compose_View SHALL resolve recipient keys or certificates and display warnings for recipients lacking the required cryptographic material.

### Requirement 12: User Settings Encryption Key Management Section

**User Story:** As a BrightMail user, I want a dedicated "Encryption Keys" section in user settings, so that I can manage all my GPG keypairs and S/MIME certificates in one place.

#### Acceptance Criteria

1. THE User_Settings_Page SHALL include an "Encryption Keys" section accessible from the settings navigation.
2. WITHIN the "Encryption Keys" section, THE Key_Management_Settings SHALL display a GPG subsection with options to generate a keypair, import a public key, export the public key, and delete the keypair.
3. WITHIN the "Encryption Keys" section, THE Key_Management_Settings SHALL display an S/MIME subsection with options to import a certificate (PEM or PKCS#12), view certificate details, and delete the certificate.
4. WHEN the user has no GPG keypair configured, THE Key_Management_Settings SHALL display a prompt to generate or import a keypair.
5. WHEN the user has no S/MIME certificate configured, THE Key_Management_Settings SHALL display a prompt to import a certificate.
6. THE Key_Management_Settings SHALL allow the user to set a default encryption preference (None, GPG, S/MIME, or ECIES) that applies globally or per contact.

### Requirement 13: Default Encryption Preference

**User Story:** As a BrightMail user, I want to set a default encryption preference globally or per contact, so that the compose UI pre-selects my preferred encryption scheme.

#### Acceptance Criteria

1. WHEN the user sets a global default encryption preference, THE Key_Store SHALL persist the preference associated with the user's account.
2. WHEN the user sets a per-contact encryption preference, THE Key_Store SHALL persist the preference associated with the specific contact email address.
3. WHEN composing a new message, THE Compose_View SHALL pre-select the encryption scheme based on the per-contact preference if one exists for the first recipient, falling back to the global default.
4. IF the pre-selected encryption scheme is not available (missing keys or certificates), THEN THE Compose_View SHALL fall back to NONE and display an informational message explaining the fallback.

### Requirement 14: GPG and S/MIME for External Recipients

**User Story:** As a BrightMail user, I want GPG and S/MIME encryption to work for both internal BrightChain recipients and external email recipients, so that I can communicate securely with anyone who has compatible keys.

#### Acceptance Criteria

1. WHEN the user selects GPG encryption for a message with external recipients, THE Email_Encryption_Service SHALL encrypt the message using the external recipient's GPG public key if available in the Key_Store.
2. WHEN the user selects S/MIME encryption for a message with external recipients, THE Email_Encryption_Service SHALL encrypt the message using the external recipient's S/MIME certificate if available in the Key_Store.
3. WHEN the user selects ECIES encryption for a message containing external recipients, THE Compose_View SHALL display a warning that ECIES is only available for internal BrightChain recipients.
4. WHEN a message has a mix of internal and external recipients and GPG or S/MIME is selected, THE Email_Encryption_Service SHALL encrypt the message for all recipients using the selected scheme, provided all recipients have the required cryptographic material.

### Requirement 15: Key and Certificate Serialization Round-Trip

**User Story:** As a developer, I want GPG keys and S/MIME certificates to survive serialization and deserialization without data loss, so that stored keys remain usable after persistence operations.

#### Acceptance Criteria

1. FOR ALL valid ASCII-armored GPG public keys, THE GPG_Key_Manager SHALL produce an identical ASCII-armored output when exporting a previously imported key (round-trip property).
2. FOR ALL valid PEM-encoded S/MIME certificates, THE SMIME_Certificate_Manager SHALL produce an identical PEM output when exporting a previously imported certificate (round-trip property).
3. FOR ALL valid GPG keypairs generated by the GPG_Key_Manager, exporting the public key and re-importing it SHALL produce a key with identical fingerprint and key ID.
