---
title: "DigitalBurnbag Architecture Documentation"
parent: "Architecture & Design"
nav_order: 8
permalink: /docs/architecture/digital-burnbag/
---
# DigitalBurnbag Architecture Documentation

## Overview

DigitalBurnbag (DigitalBurnbag.com) and CanaryProtocol (CanaryProtocol.io) form an integrated zero-knowledge secure storage system with automated fail-safe protocols:

- **DigitalBurnbag.com**: File-sharing frontend providing secure upload, storage, and access to encrypted files
- **CanaryProtocol.io**: Rules engine and webhook system managing automated protocols and third-party integrations

The system protects sensitive information through cryptographic security and automated dead man's switches that activate when users are compromised, coerced, or unable to provide proof of life.

### Core Concept

**Zero-Knowledge Architecture**: The system stores encrypted files where only users hold the primary decryption keys, ensuring true zero-knowledge storage where the service provider cannot access user data under normal circumstances.

**Canary Protocols**: Automated monitoring systems that track user activity through multiple channels:
- **Direct Interaction**: Regular login and system interaction
- **Third-Party APIs**: Twitter, Fitbit, Google, GitHub, and other services providing proof-of-life signals
- **Duress Detection**: Special duress codes that trigger protocols when entered instead of normal passwords
- **Time-Based Triggers**: Configurable timeouts for automatic protocol activation

**Protocol Actions**: When canary conditions are met (or not met), the system can:
- **File Deletion**: Secure destruction of stored encrypted files
- **Data Distribution**: Automatic delivery to predetermined recipients (journalists, lawyers, family)
- **Public Disclosure**: Submission to news organizations like The New York Times
- **Custom Actions**: User-defined protocol responses

### Dual Key Architecture

**User-Controlled Keys**: Primary encryption keys remain with users through:
- BIP39 mnemonic phrases (24-word recovery phrases)
- Client-side key derivation and storage
- Password-wrapped private keys for convenience

**System Escrow Keys**: For protocol execution, the system maintains:
- Encrypted backup keys for files requiring system-initiated decryption
- Long alphanumeric backup codes that can be distributed directly to recipients
- Time-locked key release mechanisms

**Trust Model**: Users choose their trust level:
- **Zero-Trust**: Only backup codes distributed to recipients, no system key access
- **Conditional Trust**: System holds encrypted keys for specific protocol actions
- **Hybrid**: Mix of zero-trust and conditional trust files based on sensitivity

### Use Cases

**Whistleblower Protection**: Secure storage and automatic release of sensitive documents
**Journalist Source Protection**: Dead man's switch for investigative materials
**Personal Security**: Protection against coercion, kidnapping, or government pressure
**Corporate Compliance**: Automated disclosure protocols for regulatory requirements
**Estate Planning**: Secure distribution of digital assets and information to heirs
**Activist Protection**: Safeguarding sensitive information in high-risk environments

## Project Structure

### Monorepo Architecture (Nx Workspace)

The project is organized as an Nx monorepo implementing the dual-domain architecture with the following main applications and libraries:

```
DigitalBurnbag/
├── digital-burnbag-api/              # Express.js REST API server
├── digital-burnbag-api-e2e/          # API end-to-end tests
├── digital-burnbag-api-lib/          # Backend business logic library
├── digital-burnbag-react/            # React frontend application
├── digital-burnbag-react-e2e/        # Frontend end-to-end tests
├── digital-burnbag-lib/              # Shared library (frontend/backend)
├── digital-burnbag-lib-e2e/          # Shared library tests
├── digital-burnbag-inituserdb/       # Database initialization utility
├── digital-burnbag-test-utils/       # Testing utilities
└── tools/                           # Build tools and string management
```

## Core Architecture Components

### 1. Frontend Architecture (React)

**Location**: `digital-burnbag-react/`

**Technology Stack**:
- React 19 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Vite for build tooling
- Axios for HTTP requests

**Key Components**:
- **Authentication System**: JWT-based authentication with backup codes
- **Encryption Integration**: Client-side ECIES encryption/decryption
- **Internationalization**: Multi-language support (English, French, Spanish, Ukrainian, Mandarin)
- **Theme System**: Material-UI theming with dark/light mode support

**Component Structure**:
```
src/app/
├── components/           # UI components (login, dashboard, etc.)
├── services/            # API and authentication services
├── interfaces/          # TypeScript interfaces
├── enumerations/        # Enums and constants
└── providers/           # Context providers (auth, i18n, theme)
```

### 2. Backend Architecture (Express.js)

**Location**: `digital-burnbag-api/` + `digital-burnbag-api-lib/`

**Technology Stack**:
- Express.js with TypeScript
- MongoDB with Mongoose ODM
- JWT for authentication
- Helmet for security headers
- CORS for cross-origin requests

**Architecture Patterns**:
- **Layered Architecture**: Controllers → Services → Models → Database
- **Dependency Injection**: Services are injected into controllers
- **Middleware Pipeline**: Authentication, validation, error handling
- **Transaction Support**: MongoDB transactions for data consistency

**Key Services**:
```
services/
├── ecies/               # Encryption/decryption services
├── user.ts             # User management
├── backup-code.ts      # Backup code generation/validation
├── jwt.ts              # JWT token management
├── email.ts            # Email notifications (AWS SES)
├── mnemonic.ts         # Mnemonic phrase management
└── database-initialization.ts  # Database setup
```

### 3. Shared Library Architecture

**Location**: `digital-burnbag-lib/`

**Purpose**: Common code shared between frontend and backend

**Key Modules**:
- **Cryptography**: ECIES encryption, key management, secure storage
- **Validation**: Input validation and sanitization
- **Internationalization**: Translation system and language management
- **Error Handling**: Structured error types and handling
- **Utilities**: Common helper functions and constants

## Database Architecture

### Database Technology
- **Primary**: MongoDB with Mongoose ODM
- **Transactions**: Full ACID transaction support
- **Replication**: Replica set configuration for high availability

### Core Collections

#### Users Collection
```typescript
interface IUserDocument {
  _id: ObjectId;
  username: string;              // Unique username
  email: string;                 // Unique email address
  publicKey: string;             // ECIES public key (hex)
  duressPasswords: string[];     // Encrypted duress passwords
  timezone: string;              // User timezone
  siteLanguage: StringLanguage;  // Preferred language
  directChallenge: boolean;      // Direct login challenge flag
  lastLogin?: Date;              // Last login timestamp
  emailVerified: boolean;        // Email verification status
  accountStatus: AccountStatus;  // Account status enum
  overallCanaryStatus: CanaryStatus; // Canary status
  
  // Encryption & Recovery
  mnemonicId?: ObjectId;         // Reference to mnemonic document
  mnemonicRecovery?: string;     // Encrypted mnemonic for recovery
  passwordWrappedPrivateKey?: {  // Password-encrypted private key
    salt: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    iterations: number;
  };
  backupCodes: Array<{          // Encrypted backup codes
    version: string;
    checksumSalt: string;
    checksum: string;
    encrypted: string;
  }>;
  
  // Audit fields
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  deletedAt?: Date;
  deletedBy?: ObjectId;
}
```

#### Roles Collection
```typescript
interface IRoleDocument {
  _id: ObjectId;
  name: string;                 // Role name (Admin, Member, System)
  admin: boolean;               // Admin privileges
  member: boolean;              // Member privileges
  system: boolean;              // System privileges
  child: boolean;               // Child role flag
  
  // Audit fields
  createdBy: ObjectId;
  updatedBy?: ObjectId;
}
```

#### Mnemonics Collection
```typescript
interface IMnemonicDocument {
  _id: ObjectId;
  encryptedMnemonic: string;    // AES-GCM encrypted mnemonic
  hmac: string;                 // HMAC for integrity verification
  
  // Audit fields
  createdBy: ObjectId;
  updatedBy?: ObjectId;
}
```

#### User-Role Relationships
```typescript
interface IUserRoleDocument {
  _id: ObjectId;
  userId: ObjectId;             // Reference to user
  roleId: ObjectId;             // Reference to role
  
  // Audit fields
  createdBy: ObjectId;
  updatedBy?: ObjectId;
}
```

#### Email Tokens Collection
```typescript
interface IEmailTokenDocument {
  _id: ObjectId;
  userId: ObjectId;             // Reference to user
  token: string;                // Verification token
  tokenType: EmailTokenType;    // Token type enum
  expiresAt: Date;              // Expiration timestamp
  usedAt?: Date;                // Usage timestamp
  
  // Audit fields
  createdBy: ObjectId;
}
```

## Security Architecture

### Encryption System (ECIES)

**Elliptic Curve Integrated Encryption Scheme**:
- **Curve**: secp256k1 (same as Bitcoin)
- **Key Derivation**: BIP39 mnemonic → BIP32 HD wallet → ECIES keypair
- **Symmetric Encryption**: AES-256-GCM
- **Key Exchange**: ECDH (Elliptic Curve Diffie-Hellman)

**Encryption Flow**:
1. Generate ephemeral ECIES keypair
2. Perform ECDH with recipient's public key
3. Derive AES key using HKDF
4. Encrypt data with AES-256-GCM
5. Package: ephemeral_public_key + encrypted_data + auth_tag

### Authentication System

**Multi-Factor Authentication**:
1. **Primary**: Username/email + password
2. **Backup**: Mnemonic phrase (24 words)
3. **Recovery**: Backup codes (encrypted, one-time use)

**JWT Token System**:
- **Access Tokens**: Short-lived (configurable expiration)
- **Refresh Tokens**: Longer-lived for token renewal
- **Challenge Tokens**: For multi-step authentication

### Key Management

**Mnemonic-Based System**:
- **Generation**: BIP39 24-word mnemonic phrases
- **Storage**: Encrypted with system key + user password
- **Recovery**: Multiple recovery methods (password, backup codes)
- **Derivation**: BIP32 hierarchical deterministic key derivation

**Key Wrapping**:
- Private keys wrapped with PBKDF2-derived keys
- Configurable iteration counts (default: 100,000)
- Salt-based key derivation for uniqueness

## Service Architecture

### Core Services

#### ECIESService
**Purpose**: Handles all cryptographic operations
- Key generation and derivation
- Encryption/decryption operations
- Digital signatures
- Multi-recipient encryption

#### UserService
**Purpose**: User management and authentication
- User registration and login
- Password management
- Email verification
- Account status management

#### BackupCodeService
**Purpose**: Backup code generation and validation
- Secure code generation
- Encryption and storage
- One-time use validation
- Recovery workflows

#### MnemonicService
**Purpose**: Mnemonic phrase management
- Secure storage with encryption
- HMAC integrity verification
- Recovery operations

#### EmailService
**Purpose**: Email notifications via AWS SES
- Verification emails
- Password reset notifications
- Security alerts

### Database Services

#### DatabaseInitializationService
**Purpose**: Initial system setup
- Creates system, admin, and member users
- Generates default roles and permissions
- Sets up encryption keys and mnemonics
- Handles database migrations

## API Architecture

### RESTful API Design

**Base URL**: `/api`

**Current User Endpoints** (UserController):
- `POST /register` - User registration with mnemonic generation
- `GET /refresh-token` - JWT token refresh
- `POST /account-verification` - Complete email verification
- `GET /verify` - Verify current JWT token
- `POST /resend-verification` - Resend verification email
- `POST /language` - Set user language preference
- `POST /change-password` - Change user password
- `POST /forgot-password` - Request password reset email
- `GET /verify-reset-token` - Verify password reset token
- `POST /reset-password` - Reset password with token
- `POST /recover-mnemonic` - Recover user's mnemonic phrase
- `POST /backup-code` - Login using backup code
- `GET /backup-codes` - Get backup code count
- `POST /backup-codes` - Reset/regenerate backup codes
- `POST /request-email-login` - Request email-based login
- `POST /email-challenge` - Complete email login challenge
- `POST /request-direct-login` - Request direct cryptographic login
- `POST /direct-challenge` - Complete direct login challenge

**File Operations** (Future):
- `POST /files/upload` - Upload encrypted file
- `GET /files/:id` - Download and burn file
- `DELETE /files/:id` - Delete file

### Middleware Pipeline

1. **CORS**: Cross-origin request handling
2. **Helmet**: Security headers
3. **Body Parser**: JSON/URL-encoded parsing
4. **Authentication**: JWT token validation
5. **Authorization**: Role-based access control
6. **Validation**: Input validation and sanitization
7. **Error Handling**: Structured error responses

## Development Architecture

### Build System (Nx)

**Nx Configuration**:
- **Executors**: Custom build, test, and serve executors
- **Generators**: Code generation templates
- **Dependency Graph**: Automatic dependency tracking
- **Caching**: Build and test result caching
- **Affected**: Only build/test changed projects

**Build Targets**:
- `build`: Production builds with optimization
- `serve`: Development server with hot reload
- `test`: Unit and integration tests
- `e2e`: End-to-end tests
- `lint`: Code linting and formatting

### Testing Strategy

**Unit Tests**:
- Jest for backend services
- Vitest for frontend components
- High coverage requirements (>80%)

**Integration Tests**:
- API endpoint testing with supertest
- Database integration with MongoDB Memory Server
- Service integration testing

**End-to-End Tests**:
- Playwright for frontend E2E
- API E2E with real database
- Cross-browser testing

### Development Environment

**Docker Support**:
- MongoDB replica set container
- Development environment containerization
- VS Code devcontainer support

**Environment Configuration**:
- `.env` files for configuration
- Environment-specific settings
- Secure secret management

## Deployment Architecture

### Production Considerations

**Security**:
- HTTPS enforcement
- Security headers (Helmet.js)
- Rate limiting
- Input validation and sanitization
- SQL injection prevention (NoSQL injection)

**Performance**:
- Connection pooling (MongoDB)
- Caching strategies
- Compression middleware
- Static asset optimization

**Monitoring**:
- Application logging
- Error tracking
- Performance monitoring
- Health checks

**Scalability**:
- Horizontal scaling support
- Load balancer compatibility
- Database replica sets
- Microservice-ready architecture

## Internationalization (i18n)

### Multi-Language Support

**Supported Languages**:
- English (US/UK)
- French
- Spanish
- Ukrainian
- Mandarin Chinese

### Translation System Architecture

**StringName Enum System**:
```typescript
export enum StringName {
  Common_Admin = 'common_admin',
  Common_Email = 'common_email',
  Validation_InvalidEmail = 'validation_invalidEmail',
  Registration_Success = 'registration_success',
  // 200+ predefined string keys...
}
```

**Key Features**:
- **Hierarchical Keys**: Underscore-separated namespacing (e.g., `Common_`, `Validation_`, `Admin_`)
- **Template Support**: Dynamic variable substitution in translations
- **Context-Aware**: Admin vs user context translations
- **Type Safety**: Compile-time validation of string keys
- **Enum Validation**: Ensures all languages have matching keys

**Translation Categories**:
- **Common**: Shared UI elements (buttons, labels, status)
- **Validation**: Form validation and error messages
- **Admin**: Administrative interface strings
- **Email**: Email template content
- **Registration/Login**: Authentication flow messages
- **Error**: Comprehensive error message catalog

### String Management System (`string-manager.ts`)

**StringManager Class**: Comprehensive tooling for i18n management

**Core Operations**:
```typescript
// Add new string with auto-translation
await stringManager.addString(key, englishText, {
  autoTranslate: true,
  context: 'admin' | 'user'
});

// Add string with specific translations
await stringManager.addStringWithTranslations(key, {
  'english-us': 'Save Changes',
  'french': 'Enregistrer les modifications',
  'spanish': 'Guardar cambios'
}, config);

// Add translation for existing key
await stringManager.addTranslation(key, 'french', 'Nouvelle traduction');
```

**Key Features**:
- **AWS Translate Integration**: Automatic translation via AWS Translate API
- **Backup & Rollback**: Automatic backup before changes with rollback on errors
- **Validation Pipeline**: Pre-flight consistency checks before modifications
- **File Synchronization**: Maintains StringName enum and all language files
- **Smart Sorting**: Alphabetical sorting with consistency validation
- **Snapshot System**: Baseline creation for translation validation

## Schema System Architecture

### Schema Collection Management

**SchemaCollection Enum** (`schema-collection.ts`):
Centralized enumeration defining all MongoDB collection names with type safety.

```typescript
export enum SchemaCollection {
  EmailToken = 'email-tokens',
  Role = 'roles', 
  UserToken = 'user-tokens',
  User = 'users',
  Mnemonic = 'mnemonics',
  UserRole = 'user_roles',
  UsedDirectLoginToken = 'used-direct-login-tokens'
}
```

**Key Benefits**:
- **Type Safety**: Compile-time validation of collection references
- **Consistency**: Single source of truth for collection naming
- **Refactoring**: IDE support for renaming collections across codebase
- **Documentation**: Self-documenting collection structure

### Schema Map System

**Schema Registration** (`schema.ts`):
The `getSchemaMap()` function creates a unified registry mapping each collection to its complete schema definition.

```typescript
export function getSchemaMap(connection: Connection): SchemaMap {
  return {
    EmailToken: {
      collection: SchemaCollection.EmailToken,
      model: EmailTokenModel(connection),
      modelName: ModelName.EmailToken,
      schema: EmailTokenSchema,
    },
    // ... other schemas
  };
}
```

**SchemaMap Structure**:
- **collection**: MongoDB collection name from enum
- **model**: Mongoose model factory function
- **modelName**: Model identifier for Mongoose registration
- **schema**: Mongoose schema definition with validation

**Advantages**:
- **Centralized Registration**: All schemas registered in one location
- **Lazy Loading**: Models created only when database connection established
- **Type Safety**: Full TypeScript support for all schema operations
- **Consistency**: Uniform structure across all data models

## Application Architecture

### Base Application Class

**BaseApplication** (`application-base.ts`):
Core application foundation providing database connectivity, schema management, and lifecycle control.

**Key Responsibilities**:
- **Database Connection**: MongoDB connection with replica set support
- **Schema Loading**: Dynamic schema registration and model creation
- **Environment Management**: Configuration and environment variable handling
- **Development Database**: In-memory MongoDB for testing/development
- **Transaction Support**: MongoDB transaction configuration
- **Lifecycle Management**: Startup/shutdown coordination

**Core Methods**:
```typescript
// Database lifecycle
protected async connectDatabase(mongoUri: string): Promise<void>
protected async disconnectDatabase(): Promise<void>
protected async setupDevDatabase(): Promise<string>
protected async initializeDevDatabase(): Promise<void>

// Application lifecycle
public async start(mongoUri?: string): Promise<void>
public async stop(): Promise<void>

// Model access
public getModel<T>(modelName: string): MongooseModel<T>
```

**Development Features**:
- **In-Memory Database**: MongoMemoryReplSet for isolated testing
- **Auto-Initialization**: Automatic database seeding with system users
- **Transaction Testing**: Full transaction support in development
- **Debug Logging**: Comprehensive startup and connection logging

### Express Application Class

**App** (`application.ts`):
Extends BaseApplication with Express.js web server functionality.

**Additional Responsibilities**:
- **Express Server**: HTTP/HTTPS server management
- **Middleware Pipeline**: Security, parsing, and authentication middleware
- **Router Integration**: API and application route registration
- **Error Handling**: Global error handling and response formatting
- **SSL Support**: Development HTTPS server with certificate loading

**Server Features**:
- **Dual Protocol**: HTTP and HTTPS servers for development
- **Graceful Shutdown**: Proper connection cleanup on stop
- **Error Recovery**: Automatic error handling and process management
- **Ready State**: Coordinated startup with database connectivity

## Controller Base Architecture

### BaseController Class

**BaseController** (`base.ts`):
Abstract base class providing comprehensive routing, validation, and authentication infrastructure.

**Core Features**:

#### Route Configuration System
```typescript
interface RouteConfig<H> {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handlerKey: keyof H;
  useAuthentication?: boolean;
  useCryptoAuthentication?: boolean;
  validation?: ValidationChain[] | ((lang: StringLanguage) => ValidationChain[]);
  middleware?: RequestHandler[];
  rawJsonHandler?: boolean;
  handlerArgs?: any[];
}
```

#### Authentication Pipeline
- **Token Authentication**: JWT token validation and user population
- **Crypto Authentication**: Challenge-response cryptographic authentication
- **User Validation**: Database user lookup and validation
- **Authorization**: Role-based access control integration

#### Validation System
- **Express Validator**: Comprehensive input validation
- **Dynamic Validation**: Language-aware validation rules
- **Boolean Handling**: Automatic false boolean field population
- **Validated Body**: Type-safe access to validated request data

#### Transaction Support
```typescript
public async withTransaction<T>(
  callback: TransactionCallback<T>,
  session?: ClientSession,
  options?: TransactionOptions
): Promise<T>
```

#### Request Context Management
- **Active Request/Response**: Thread-safe request context
- **User Access**: Type-safe authenticated user access
- **Validated Data**: Sanitized and validated request body
- **Error Handling**: Structured error response system

**Controller Lifecycle**:
1. **Route Definition**: Abstract `initRouteDefinitions()` method
2. **Middleware Assembly**: Authentication, validation, and custom middleware
3. **Handler Execution**: Type-safe handler method invocation
4. **Response Formatting**: Consistent API response structure
5. **Error Handling**: Automatic error catching and formatting

## Routing System Architecture

### Router Hierarchy

**AppRouter** (`routers/app.ts`):
Top-level router coordinating all application routes.

**ApiRouter** (`routers/api.ts`):
API-specific router managing all `/api` endpoints with:
- **Controller Registration**: Automatic controller route mounting
- **Middleware Pipeline**: API-specific middleware (CORS, security headers)
- **Version Management**: API versioning support
- **Documentation**: Automatic API documentation generation

### Route Registration Pattern

**Controller Integration**:
```typescript
// In ApiRouter
const userController = new UserController(application);
this.router.use('/users', userController.router);

// In Controller
protected initRouteDefinitions(): void {
  this.routeDefinitions = [
    {
      method: 'post',
      path: '/register',
      handlerKey: 'register',
      validation: RegisterValidation,
      useAuthentication: false
    },
    {
      method: 'get',
      path: '/verify',
      handlerKey: 'verify',
      useAuthentication: true
    }
  ];
}
```

**Middleware Pipeline Order**:
1. **Authentication**: Token/crypto validation
2. **Language Context**: Global language setting
3. **Validation**: Input validation and sanitization
4. **Custom Middleware**: Route-specific middleware
5. **Handler Execution**: Controller method invocation
6. **Error Handling**: Global error catching

### Type Safety Features

**Generic Controller Types**:
- **Response Types**: Strongly typed API responses
- **Handler Types**: Type-safe handler method signatures
- **Validation Types**: Compile-time validation rule checking
- **Route Configuration**: Type-safe route definition

**Benefits**:
- **Compile-Time Safety**: Catch routing errors at build time
- **IntelliSense Support**: Full IDE autocomplete for routes
- **Refactoring Safety**: Automatic updates across route references
- **Documentation**: Self-documenting route structure

## Mongoose Schema Architecture

### Schema Definition System

**Schema Structure**: Each MongoDB collection has a corresponding Mongoose schema with comprehensive validation, indexing, and middleware.

#### User Schema (`schemas/user.ts`)
**Core User Data Model**:
```typescript
export const UserSchema: Schema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => AppConstants.UsernameRegex.test(v),
      message: () => translate(StringName.Validation_UsernameRegexErrorTemplate)
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: (props) => `${props.value} is not a valid email address`
    }
  },
  publicKey: {
    type: String,
    required: true,
    unique: true
  },
  // Cryptographic and security fields
  duressPasswords: { type: [String], default: [] },
  passwordWrappedPrivateKey: {
    type: {
      salt: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
      ciphertext: { type: String, required: true },
      iterations: { type: Number, required: true }
    },
    required: false
  },
  backupCodes: {
    type: [{
      version: { type: String, required: true },
      checksumSalt: { type: String, required: true },
      checksum: { type: String, required: true },
      encrypted: { type: String, required: true }
    }],
    default: []
  },
  // User preferences and status
  timezone: {
    type: String,
    required: true,
    default: 'UTC',
    validate: {
      validator: (v: string) => isValidTimezone(v),
      message: (props) => translate(StringName.Common_NotValidTimeZoneTemplate)
    }
  },
  siteLanguage: {
    type: String,
    enum: Object.values(StringLanguage),
    default: DefaultLanguage,
    required: true
  },
  accountStatus: {
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.PendingEmailVerification
  },
  overallCanaryStatus: {
    type: String,
    enum: Object.values(CanaryStatus),
    default: CanaryStatus.Alive,
    required: true
  },
  // Audit and relationship fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: ModelName.User,
    required: true,
    immutable: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: ModelName.User,
    optional: true
  },
  mnemonicId: {
    type: Schema.Types.ObjectId,
    ref: ModelName.Mnemonic,
    required: false
  }
}, { timestamps: true });
```

#### Role Schema (`schemas/role.ts`)
**Role-Based Access Control**:
```typescript
export const RoleSchema = new Schema<IRoleDocument>({
  name: {
    type: String,
    enum: Object.values(Role),
    required: true,
    immutable: true
  },
  admin: { type: Boolean, default: false, immutable: true },
  member: { type: Boolean, default: false, immutable: true },
  child: { type: Boolean, default: false, immutable: true },
  system: { type: Boolean, default: false, immutable: true },
  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: ModelName.User,
    required: true,
    immutable: true
  }
}, { timestamps: true });

// Custom validation middleware
RoleSchema.pre('save', function(next) {
  if (this.admin && this.child) {
    return next(new Error('A child role cannot be an admin role'));
  }
  if (this.system && this.child) {
    return next(new Error('A child role cannot be a system role'));
  }
  next();
});
```

#### Email Token Schema (`schemas/email-token.ts`)
**Email Verification and Password Reset**:
```typescript
export const EmailTokenSchema = new Schema<IEmailTokenDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: ModelName.User,
    immutable: true
  },
  type: {
    type: String,
    enum: Object.values(EmailTokenType),
    required: true,
    immutable: true
  },
  token: {
    type: String,
    required: true,
    immutable: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    immutable: true,
    validate: {
      validator: (v: string) => validator.isEmail(v),
      message: (props) => `${props.value} is not a valid email address!`
    }
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    index: { expires: '1d' }
  }
}, { timestamps: true });

// Compound index for efficient queries
EmailTokenSchema.index({ userId: 1, email: 1, type: 1 }, { unique: true });
```

#### Mnemonic Schema (`schemas/mnemonic.ts`)
**Secure Mnemonic Storage**:
```typescript
export const MnemonicSchema: Schema = new Schema<IMnemonicDocument>({
  hmac: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: (v: string) => AppConstants.HmacRegex.test(v),
      message: () => translate(StringName.Validation_HmacRegex)
    }
  }
});
```

#### User-Role Schema (`schemas/user-role.ts`)
**Many-to-Many Relationship Management**:
```typescript
export const UserRoleSchema = new Schema<IUserRoleDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: ModelName.User,
    required: true
  },
  roleId: {
    type: Schema.Types.ObjectId,
    ref: ModelName.Role,
    required: true
  },
  // Audit fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: ModelName.User,
    required: true,
    immutable: true
  }
}, { timestamps: true });

// Compound indexes for efficient queries
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
UserRoleSchema.index({ userId: 1 });
UserRoleSchema.index({ roleId: 1 });
```

### Model Factory System

**Model Creation Pattern**: Each schema has a corresponding model factory function that creates Mongoose models with proper typing.

```typescript
// Example: User Model Factory
export function UserModel(connection: Connection) {
  return connection.model<IUserDocument>(
    ModelName.User,
    UserSchema,
    SchemaCollection.User
  );
}
```

**Benefits**:
- **Connection Isolation**: Models bound to specific database connections
- **Type Safety**: Full TypeScript integration with document interfaces
- **Lazy Loading**: Models created only when needed
- **Testing Support**: Easy mocking and test database setup

### Document Interface System

**Type Hierarchy**: Document interfaces extend base interfaces with Mongoose-specific functionality.

```typescript
// Base document interface
export type IBaseDocument<T, I extends Types.ObjectId | string = DefaultBackendIdType> = 
  Document<I> & T;

// User document interface
export type IUserDocument = IBaseDocument<
  IUserBase<
    DefaultBackendIdType,
    Date,
    StringLanguage,
    AccountStatus,
    CanaryStatus
  >
>;
```

**Interface Composition**: Base interfaces use generic types for flexibility across frontend/backend.

```typescript
export interface IUserBase<
  I extends Types.ObjectId | string,
  D extends Date | string,
  S extends StringLanguage | string,
  A extends AccountStatus | string,
  C extends CanaryStatus | string
> extends IHasId<I>,
    IHasTimestamps<D>,
    IHasTimestampOwners<I>,
    IHasSoftDelete<D>,
    IHasSoftDeleter<I> {
  username: string;
  email: string;
  publicKey: string;
  // ... other fields
}
```

### Schema Features

#### Validation System
- **Built-in Validators**: Email, regex pattern, enum validation
- **Custom Validators**: Timezone validation, username format
- **Async Validation**: Database uniqueness checks
- **Error Messages**: Internationalized validation messages

#### Indexing Strategy
- **Unique Indexes**: Username, email, public key uniqueness
- **Compound Indexes**: Multi-field query optimization
- **TTL Indexes**: Automatic document expiration for tokens
- **Performance Indexes**: Fast lookups for common queries

#### Middleware Integration
- **Pre-save Hooks**: Custom validation logic
- **Post-save Hooks**: Audit logging and notifications
- **Pre-remove Hooks**: Cascade deletion handling
- **Virtual Fields**: Computed properties and relationships

#### Audit Trail System
- **Created/Updated By**: User tracking for all modifications
- **Timestamps**: Automatic creation and update timestamps
- **Soft Delete**: Logical deletion with deletedAt/deletedBy fields
- **Immutable Fields**: Prevent modification of critical data

### Type Safety Features

#### Generic Type System
```typescript
type ModelDocMap = {
  EmailToken: IEmailTokenDocument;
  Mnemonic: IMnemonicDocument;
  Role: IRoleDocument;
  UsedDirectLoginToken: IUsedDirectLoginTokenDocument;
  User: IUserDocument;
  UserRole: IUserRoleDocument;
};

export type SchemaMap = {
  [K in keyof ModelDocMap]: ISchema<ModelDocMap[K]>;
};
```

#### Branded Types
```typescript
export type HexString = Brand<string, 'HexString'>;
export type SignatureString = Brand<HexString, 'SignatureString'>;
export type ChecksumBuffer = Buffer & Brand<Buffer, 'Sha3Checksum', 'ChecksumBuffer'>;
```

**Benefits**:
- **Compile-Time Safety**: Prevent type mismatches at build time
- **IntelliSense Support**: Full IDE autocomplete for all operations
- **Refactoring Safety**: Automatic updates across schema references
- **Runtime Validation**: Mongoose validation with TypeScript typesStrict validation against baseline snapshots

### Translation Functions (`i18n.ts`)

**Core Translation API**: Two primary functions for string translation

#### `translate()` Function

**Primary Translation Function**:
```typescript
export const translate = (
  name: StringName,                    // Translation key from enum
  otherVars?: Record<string, string | number>, // Template variables
  language?: StringLanguage,           // Target language (optional)
  context: LanguageContext = 'admin',  // Admin/user context
  visitedStringNames?: Set<StringName>, // Circular reference prevention
  fallbackLanguage: StringLanguage = DefaultLanguage // Fallback language
): string
```

**Features**:
- **Enum-Based Keys**: Uses StringName enum for type safety
- **Template Variables**: Dynamic variable substitution with `{VARIABLE}` syntax
- **Context Awareness**: Different translations for admin vs user interfaces
- **Language Fallback**: Automatic fallback to default language on errors
- **Circular Protection**: Prevents infinite loops in nested translations
- **Global Context**: Uses GlobalActiveContext when parameters not provided

**Usage Examples**:
```typescript
// Simple translation
translate(StringName.Common_Save) // "Save"

// With template variables
translate(StringName.Error_FailedToCreateUserTemplate, {
  NAME: username
}) // "Failed to create user: {username}"

// Specific language and context
translate(
  StringName.Validation_InvalidEmail,
  undefined,
  StringLanguage.French,
  'user'
) // "Adresse e-mail invalide"

// Nested StringName references
translate(StringName.Admin_UserCreatedTemplate, {
  STATUS: StringName.Common_Active // Automatically translates nested StringName
})
```

#### `t()` Function

**Template-Based Translation Function**:
```typescript
export function t<T extends string>(
  str: IsValidStringNameTemplate<T> extends true ? T : never,
  language?: StringLanguage,
  context: LanguageContext = 'admin',
  ...otherVars: Record<string, string | number>[]
): string
```

**Features**:
- **Template Syntax**: Uses `{{StringName.Key}}` syntax for embedded translations
- **Type Safety**: Compile-time validation of StringName references
- **Multiple Variables**: Supports multiple variable objects
- **Automatic Processing**: Processes StringName patterns and variables in sequence

**Usage Examples**:
```typescript
// Template with StringName references
t(
  '{{StringName.Common_User}} {{StringName.Common_Created}}: {name}',
  StringLanguage.French,
  'admin',
  { name: 'John Doe' }
) // "Utilisateur créé: John Doe"

// Multiple variable sets
t(
  '{{StringName.Error_FailedToCreateUserTemplate}}: {{StringName.Common_Status}}',
  undefined,
  'admin',
  { NAME: 'testuser' },
  { STATUS: 'inactive' }
)

// Complex nested templates
t(
  '{{StringName.Admin_TransactionFailedTransientTemplate}}',
  StringLanguage.Spanish,
  'admin',
  { OPERATION: 'database update', RETRY_COUNT: '3' }
)
```

### Advanced Translation Features

#### **Variable Replacement System**:
```typescript
// Template variables support multiple sources:
// 1. Provided otherVars
// 2. AppConstants values
// 3. Nested StringName references

replaceVariables(
  "User {NAME} has {STATUS} status",
  StringLanguage.EnglishUS,
  'admin',
  { NAME: 'john', STATUS: StringName.Common_Active }
)
```

#### **Enum Translation System**:
```typescript
// Register enum translations
registerTranslation(AccountStatus, {
  [StringLanguage.EnglishUS]: {
    [AccountStatus.Active]: 'Active',
    [AccountStatus.Inactive]: 'Inactive'
  },
  [StringLanguage.French]: {
    [AccountStatus.Active]: 'Actif',
    [AccountStatus.Inactive]: 'Inactif'
  }
}, 'AccountStatus');

// Translate enum values
translateEnumValue(AccountStatus, AccountStatus.Active, StringLanguage.French)
// Returns: "Actif"
```

#### **Error Handling & Fallbacks**:
```typescript
// Graceful degradation on missing translations
// 1. Try requested language
// 2. Fall back to default language
// 3. Return StringName key as last resort
// 4. Log warnings for missing translations

translate(StringName.NonExistentKey, {}, StringLanguage.French)
// Logs warning, returns 'NonExistentKey'
```

#### **Context-Aware Translation**:
```typescript
// Different translations based on user type
const adminMessage = translate(
  StringName.Error_DatabaseConnection,
  undefined,
  undefined,
  'admin'
) // Technical details for admins

const userMessage = translate(
  StringName.Error_DatabaseConnection,
  undefined,
  undefined,
  'user'
) // User-friendly message
```

### Integration Patterns

**React Components**:
```typescript
const MyComponent = () => {
  const errorMessage = translate(
    StringName.Validation_InvalidEmail,
    undefined,
    GlobalActiveContext.language,
    'user'
  );
  
  return <div>{errorMessage}</div>;
};
```

**Error Messages**:
```typescript
throw new TranslatableError(
  StringName.Error_FailedToCreateUserTemplate,
  { NAME: username },
  GlobalActiveContext.language,
  'admin'
);
```

**API Responses**:
```typescript
res.json({
  message: translate(
    StringName.Registration_Success,
    { MNEMONIC: mnemonic },
    req.user?.language,
    'user'
  )
});
```

### Performance & Caching

- **Lazy Loading**: Translation files loaded on demand
- **Memoization**: Repeated translations cached automatically
- **Circular Detection**: Prevents infinite loops in nested references
- **Type Safety**: Compile-time validation prevents runtime errors
- **Global Context**: Efficient context switching for admin/user modes

## Error Handling Architecture

### HandleableError System

**Base Error Class** (`handleable-error.ts`):
```typescript
export class HandleableError extends Error {
  public readonly cause?: Error;           // Chained error cause
  public readonly statusCode: number;      // HTTP status code
  public readonly sourceData?: unknown;    // Additional error context
  private _handled: boolean;               // Error handling state

  constructor(message: string, options?: HandleableErrorOptions)
}
```

**Key Features**:
- **Error Chaining**: Maintains cause chain with stack trace concatenation
- **HTTP Integration**: Built-in status code support for API responses
- **Handling State**: Tracks whether error has been processed
- **Serialization**: JSON serialization for logging and API responses
- **Stack Preservation**: Maintains proper stack traces across transpilation
- **Source Data**: Attaches contextual data for debugging

**Error Chain Example**:
```typescript
try {
  await databaseOperation();
} catch (dbError) {
  throw new HandleableError('User operation failed', {
    cause: dbError,
    statusCode: 500,
    sourceData: { userId: '123', operation: 'update' }
  });
}
```

### TranslatableError System

**Internationalized Errors** (`translatable.ts`):
```typescript
export class TranslatableError extends HandleableError {
  public readonly StringName: StringName;
  
  constructor(
    string: StringName,                    // Translation key
    otherVars?: Record<string, string | number>, // Template variables
    language?: StringLanguage,             // Target language
    context?: LanguageContext,             // Admin/user context
    options?: HandleableErrorOptions       // Base error options
  )
}
```

**Features**:
- **Automatic Translation**: Error messages translated based on user language
- **Template Support**: Dynamic variable substitution in error messages
- **Context Awareness**: Different messages for admin vs user interfaces
- **Consistent Messaging**: All errors use centralized translation system

**Usage Examples**:
```typescript
// Simple translated error
throw new TranslatableError(StringName.Validation_InvalidEmail);

// Error with template variables
throw new TranslatableError(
  StringName.Error_FailedToCreateUserTemplate,
  { NAME: username },
  StringLanguage.French,
  'admin'
);

// Chained translatable error
throw new TranslatableError(
  StringName.Admin_Error_FailedToInitializeUserDatabase,
  undefined,
  undefined,
  'admin',
  { cause: originalError, statusCode: 500 }
);
```

### Translatable Enum System

**Enum Translation Registry** (`translatable-enum.ts`):
```typescript
export enum TranslatableEnumType {
  AccountStatus,    // User account status values
  EmailTokenType,   // Email verification token types
  EncryptionType,   // Encryption algorithm types
}
```

**Enum Translation Files** (`enumeration-translations/`):
```typescript
// account-status.ts
export const AccountStatusTranslations: EnumTranslations<AccountStatus> = {
  [AccountStatus.Active]: {
    [StringLanguage.EnglishUS]: 'Active',
    [StringLanguage.French]: 'Actif',
    [StringLanguage.Spanish]: 'Activo'
  },
  [AccountStatus.PendingEmailVerification]: {
    [StringLanguage.EnglishUS]: 'Pending Email Verification',
    [StringLanguage.French]: 'Vérification d\'email en attente'
  }
};
```

**Key Features**:
- **Type Safety**: Compile-time validation of enum value translations
- **Completeness Checking**: Ensures all enum values have translations
- **Consistent UI**: Enum values displayed consistently across languages
- **Centralized Management**: All enum translations in dedicated files

### Error Handling Patterns

**API Error Responses**:
```typescript
// Middleware error handler
app.use((err: HandleableError | Error, req, res, next) => {
  const handleableError = err instanceof HandleableError 
    ? err 
    : new HandleableError(err.message, { cause: err });
    
  handleError(handleableError, res, sendApiMessageResponse, next);
});
```

**Service Layer Error Handling**:
```typescript
// Service method with proper error context
async createUser(userData: CreateUserData): Promise<IUserDocument> {
  try {
    return await this.userModel.create(userData);
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key
      throw new TranslatableError(
        StringName.Validation_EmailInUse,
        undefined,
        undefined,
        'user',
        { cause: error, statusCode: 409 }
      );
    }
    throw new TranslatableError(
      StringName.Error_FailedToCreateUserTemplate,
      { NAME: userData.username },
      undefined,
      'admin',
      { cause: error, statusCode: 500 }
    );
  }
}
```

**Frontend Error Display**:
```typescript
// React component error handling
const handleApiError = (error: ApiErrorResponse) => {
  if (error.translatable) {
    // Display translated error message
    setErrorMessage(translate(error.stringName, error.variables));
  } else {
    // Fallback to raw message
    setErrorMessage(error.message);
  }
};
```

### Error Categories

**Validation Errors**: Input validation failures with field-specific messages
**Authentication Errors**: Login, token, and permission-related errors
**Business Logic Errors**: Domain-specific error conditions
**System Errors**: Database, network, and infrastructure failures
**Security Errors**: Unauthorized access and security violations

**Benefits**:
- **Consistent UX**: All errors properly translated and contextualized
- **Debugging Support**: Full error chains with stack traces and context
- **API Integration**: HTTP status codes and structured error responses
- **Maintainability**: Centralized error message management
- **Type Safety**: Compile-time validation of error handling patterns

**Translation Workflow**:
1. **Key Format Validation**: PascalCase with underscores (e.g., `Common_SaveChanges`)
2. **Enum Value Generation**: Converts to camelCase format (`common_saveChanges`)
3. **Multi-file Updates**: Updates StringName enum + all 6 language files atomically
4. **Quote Handling**: Smart quote selection (single/double) based on content
5. **Consistency Validation**: Ensures all files have matching keys

**CLI Commands**:
- `yarn strings:add <key> <text>` - Add new translatable string
- `yarn strings:translate <key> <language> <translation>` - Add specific translation
- `yarn strings:sort` - Alphabetically sort all translation files
- `yarn strings:validate` - Validate translation consistency
- `yarn strings:snapshot` - Create translation baseline snapshot
- `yarn strings:validate:strict` - Validate against snapshot

**Auto-Translation Features**:
- **AWS Integration**: Uses AWS Translate with formal tone
- **Language Mapping**: Maps UI languages to AWS language codes
- **Fallback System**: Amazon Q placeholders when AWS unavailable
- **Source Language**: Configurable source language for translations

**Validation System**:
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];  // Missing/extra keys, inconsistencies
}

// Standard validation
const result = await stringManager.validateFiles();

// Strict snapshot validation
const strictResult = await stringManager.validateStrict(snapshotPath);
```

**Snapshot System**:
```typescript
interface I18nSnapshot {
  enumKeys: string[];                           // All StringName keys
  enumEntries: Record<string, string>;          // Key->value mapping
  languages: Record<string, Record<string, string>>; // All translations
  meta: { generatedAt: string };               // Metadata
}
```

**Error Handling & Recovery**:
- **Atomic Operations**: All-or-nothing updates with automatic rollback
- **Pre-flight Validation**: Consistency checks before any modifications
- **Backup System**: Complete file state backup before changes
- **Graceful Degradation**: Continues with placeholders if AWS unavailable

## Development Tools Architecture

### String Management Workflow

**Development Process**:
1. **Add New String**: `yarn strings:add Common_NewFeature "New Feature"`
2. **Auto-Translation**: AWS Translate generates translations for all languages
3. **Manual Review**: Developers review and refine auto-generated translations
4. **Validation**: `yarn strings:validate` ensures consistency
5. **Sorting**: `yarn strings:sort` maintains alphabetical order
6. **Snapshot**: `yarn strings:snapshot` creates baseline for CI/CD

**File Structure**:
```
digital-burnbag-lib/src/lib/
├── enumerations/string-name.ts     # Master enum with 200+ keys
└── strings/
    ├── english-us.ts               # Primary language
    ├── english-uk.ts               # British English variant
    ├── french.ts                   # French translations
    ├── spanish.ts                  # Spanish translations
    ├── mandarin.ts                 # Mandarin Chinese
    └── ukrainian.ts                # Ukrainian translations
```

**Integration Points**:
- **Build Pipeline**: Validation runs in CI/CD
- **Development**: Hot-reload with translation changes
- **Testing**: Snapshot validation prevents regressions
- **Deployment**: Ensures translation completeness

## Configuration Management

### Environment Variables

**Core Configuration**:
```bash
# Database
MONGO_URI=mongodb://localhost:27017/digital-burnbag
MONGO_USE_TRANSACTIONS=true

# Security
JWT_SECRET=your-jwt-secret
MNEMONIC_HMAC_SECRET=64-char-hex-string
MNEMONIC_ENCRYPTION_KEY=64-char-hex-string

# AWS (Email)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-west-2

# Application
DEBUG=true
HOST=0.0.0.0
PORT=3000
```

### System Users

**Default System Users**:
1. **System User**: Internal system operations
2. **Admin User**: Administrative access
3. **Member User**: Standard user access

Each user has:
- Unique mnemonic phrase
- Generated passwords
- Backup codes
- Role assignments

## Future Architecture Considerations

### Planned Features

**File Sharing**:
- Encrypted file upload/download
- Time-based expiration
- Access logging and auditing
- Burn-after-reading functionality

**Advanced Security**:
- Hardware security module (HSM) integration
- Multi-signature operations
- Canary tokens and dead man's switches
- Advanced threat detection

**Scalability**:
- Microservice decomposition
- Event-driven architecture
- Message queuing systems
- Distributed caching

**Compliance**:
- GDPR compliance features
- Audit logging
- Data retention policies
- Privacy controls

## Utility Architecture

### Core Utilities (`utils.ts`)

**Debugging & Logging**:
```typescript
debugLog(debug: boolean, type: 'error'|'warn'|'log', ...args)
translatedDebugLog(debug, type, context, stringValue, vars, ...args)
```

**Data Encoding/Conversion**:
```typescript
// Base64 operations
uint8ArrayToBase64(uint8Array: Uint8Array): string
base64ToUint8Array(base64String: string): Uint8Array

// Hex operations  
uint8ArrayToHex(uint8Array: Uint8Array): string
hexToUint8Array(hexString: string): Uint8Array

// String operations
stringToUint8Array(str: string): Uint8Array
uint8ArrayToString(array: Uint8Array): string
```

**Cryptographic Utilities**:
```typescript
// CRC16-CCITT for data integrity
crc16(data: Uint8Array): Uint8Array

// Secure random generation
randomBytes(length: number): Uint8Array

// Array operations
arraysEqual(a: Uint8Array, b: Uint8Array): boolean
concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array
```

**Length Encoding System**:
```typescript
// Variable-length encoding for efficient data storage
getLengthEncodingTypeForLength(length: number): LengthEncodingType
lengthEncodeData(data: Uint8Array): Uint8Array
decodeLengthEncodedData(data: Uint8Array): {data: Uint8Array, totalLength: number}
```

**Validation & Object Manipulation**:
```typescript
// Timezone validation
isValidTimezone(timezone: string): boolean

// Object utilities
omit<T, K>(obj: T, keys: K[]): Omit<T, K>

// Enum validation
validateEnumCollection(collection, enumObject, collectionName?, enumName?)
```

## Base Class Architecture

### BaseController (`controllers/base.ts`)

**Purpose**: Abstract base for all API controllers

**Key Features**:
- **Route Definition System**: Declarative route configuration
- **Middleware Pipeline**: Authentication, validation, crypto auth
- **Request Lifecycle Management**: Active request/response tracking
- **Validation Integration**: Express-validator integration with i18n
- **Transaction Support**: Built-in database transaction wrapper
- **Error Handling**: Structured error response system

**Core Methods**:
```typescript
protected abstract initRouteDefinitions(): void
protected authenticateRequest(route, req, res, next): Promise<void>
protected checkRequestValidationAndThrow(req, res, next, validationArray): void
public async withTransaction<T>(callback, session?, options?): Promise<T>
```

**Request Context Access**:
```typescript
get user(): IRequestUserDTO           // Authenticated user
get validatedBody(): Record<string, any>  // Validated request data
get req(): Request                    // Current request
get res(): Response                   // Current response
```

### BaseService (`services/base.ts`)

**Purpose**: Abstract base for all business logic services

**Key Features**:
- **Application Context**: Access to database, environment, models
- **Transaction Support**: Consistent transaction handling across services
- **Dependency Injection**: Constructor-based application injection

**Core Structure**:
```typescript
export class BaseService {
  protected readonly application: IApplication;
  
  constructor(application: IApplication) {
    this.application = application;
  }
  
  public async withTransaction<T>(
    callback: TransactionCallback<T>,
    session?: ClientSession,
    options?: TransactionOptions
  ): Promise<T>
}
```

### BaseRouter (`routers/base.ts`)

**Purpose**: Abstract base for Express router organization

**Key Features**:
- **Router Encapsulation**: Clean separation of routing concerns
- **Application Access**: Shared application context
- **Modular Design**: Composable router architecture

**Core Structure**:
```typescript
export abstract class BaseRouter {
  public readonly router: Router;
  public readonly application: IApplication;
  
  protected constructor(application: IApplication) {
    this.application = application;
    this.router = Router();
  }
}
```

## Architecture Benefits

**Type Safety**: Full TypeScript coverage with strict typing
**Modularity**: Clear separation of concerns across layers
**Testability**: Dependency injection and transaction isolation
**Maintainability**: Consistent patterns and base class inheritance
**Internationalization**: Comprehensive i18n system with tooling
**Security**: Built-in validation, authentication, and crypto support
**Performance**: Efficient encoding, caching, and transaction management

This architecture provides a solid foundation for a secure, scalable, and maintainable encrypted communication system with room for future enhancements and enterprise-grade features.