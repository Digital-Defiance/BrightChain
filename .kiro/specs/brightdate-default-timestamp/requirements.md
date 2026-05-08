# Requirements Document

## Introduction

This feature establishes BrightDate (decimal days since J2000.0) as the native and default timestamp format for all transactions, schemas, and interfaces across the Brightchain ecosystem. Traditional dates (JavaScript `Date`, ISO 8601 strings) become derived values converted from BrightDate on demand, rather than the source of truth. This inverts the current pattern where BrightDate is used only for display alongside locale dates.

## Glossary

- **BrightDate**: A decimal number representing days since the J2000.0 epoch (January 1, 2000, 12:00:00 UTC). Implemented as the `BrightDate` class in `@digitaldefiance/brightdate`.
- **BrightDateValue**: The numeric type alias (`number`) representing a raw BrightDate value without the class wrapper.
- **Transaction**: Any discrete operation recorded in the system that requires a timestamp (block creation, message send, key registration, delivery receipt, etc.).
- **Schema**: A TypeScript interface or type definition that includes one or more timestamp fields.
- **Traditional_Date**: A JavaScript `Date` object or ISO 8601 string representation of a point in time.
- **Timestamp_Field**: Any property in a schema that records when an event occurred (e.g., `createdAt`, `updatedAt`, `timestamp`, `sentAt`, `deliveredAt`).
- **Conversion_Utility**: A function that transforms between BrightDateValue and Traditional_Date formats.
- **Shared_Library**: The `@brightchain/brightchain-lib` package containing interfaces shared across all consumers.
- **API_Library**: The `@brightchain/brightchain-api-lib` package containing Node.js-specific implementations.
- **Frontend_Library**: The `@brightchain/brightchain-react` package containing React-specific components.
- **Generic_Timestamp_Interface**: A generic interface parameterized by timestamp type (`TTimestamp`) to support both BrightDateValue and Traditional_Date representations for DTO flexibility.

## Requirements

### Requirement 1: Native Timestamp Type Definition

**User Story:** As a developer, I want a standardized generic timestamp interface pattern, so that all schemas can express timestamps as BrightDateValue natively while supporting Traditional_Date for DTO serialization.

#### Acceptance Criteria

1. THE Shared_Library SHALL export a `BrightDateTimestamp` type alias that resolves to `BrightDateValue` (a `number`).
2. THE Shared_Library SHALL export a generic `ITimestamped<TTimestamp = BrightDateTimestamp>` interface containing `createdAt: TTimestamp` and `updatedAt: TTimestamp` fields.
3. WHEN a schema requires timestamp fields, THE Schema SHALL use `BrightDateTimestamp` as the default type parameter for all Timestamp_Fields.
4. WHERE a DTO requires Traditional_Date representation, THE Schema SHALL parameterize the Generic_Timestamp_Interface with `string` (ISO 8601) or `Date` as the type argument.

### Requirement 2: Schema Migration to BrightDate Timestamps

**User Story:** As a developer, I want all existing interfaces with timestamp fields to use BrightDateValue as their native timestamp type, so that BrightDate is the single source of truth for time across the system.

#### Acceptance Criteria

1. THE Shared_Library SHALL define all Timestamp_Fields in shared interfaces using `BrightDateTimestamp` as the default type.
2. WHEN an existing interface uses `Date` or `string` for a Timestamp_Field, THE Shared_Library SHALL migrate that field to use `BrightDateTimestamp` as the default generic parameter.
3. THE Shared_Library SHALL preserve backward compatibility by allowing interfaces to be parameterized with `Date` or `string` for consumers that have not yet migrated.
4. WHEN a new interface is created, THE Schema SHALL use `BrightDateTimestamp` for all Timestamp_Fields without exception.

### Requirement 3: Transaction Timestamp Generation

**User Story:** As a developer, I want all transactions to generate their timestamps as BrightDateValue at the point of creation, so that no conversion from Traditional_Date is needed for the primary record.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE System SHALL generate the timestamp by calling `BrightDate.now().value` to produce a `BrightDateValue`.
2. THE System SHALL store the generated `BrightDateValue` directly in the Transaction record without intermediate conversion to Traditional_Date.
3. IF a Transaction receives a Traditional_Date as input, THEN THE System SHALL convert it to `BrightDateValue` using `BrightDate.fromDate()` before storing.
4. THE System SHALL use `BrightDateValue` for all temporal ordering and comparison operations on Transactions.

### Requirement 4: Conversion Utilities

**User Story:** As a developer, I want well-defined conversion utilities between BrightDateValue and Traditional_Date, so that I can derive traditional dates from BrightDate when needed for display or external system integration.

#### Acceptance Criteria

1. THE Shared_Library SHALL export a `brightDateToDate(value: BrightDateValue): Date` Conversion_Utility.
2. THE Shared_Library SHALL export a `dateToBrightDate(date: Date): BrightDateValue` Conversion_Utility.
3. THE Shared_Library SHALL export a `brightDateToISO(value: BrightDateValue): string` Conversion_Utility.
4. THE Shared_Library SHALL export a `isoToBrightDate(iso: string): BrightDateValue` Conversion_Utility.
5. FOR ALL valid BrightDateValue inputs, parsing then converting to Date then converting back to BrightDateValue SHALL produce a value within 1 microday (0.000001) of the original (round-trip property).
6. FOR ALL valid Date inputs, converting to BrightDateValue then converting back to Date SHALL produce a Date within 86 milliseconds (1 microday) of the original (round-trip property).

### Requirement 5: JSON Serialization with BrightDate

**User Story:** As a developer, I want JSON serialization to preserve BrightDateValue fields as numbers, so that timestamps remain in their native format during API communication and storage.

#### Acceptance Criteria

1. WHEN a schema containing BrightDateTimestamp fields is serialized to JSON, THE Serializer SHALL output the BrightDateValue as a JSON number.
2. WHEN JSON containing a BrightDateValue number is deserialized, THE Deserializer SHALL reconstruct the BrightDateValue without loss of precision.
3. THE Shared_Library SHALL export a JSON replacer function that annotates BrightDateValue fields for type-safe deserialization when mixed with other numeric fields.
4. THE Shared_Library SHALL export a JSON reviver function that reconstructs BrightDateValue fields from annotated JSON.
5. FOR ALL valid BrightDateValue inputs, serializing to JSON then deserializing SHALL produce an identical BrightDateValue (round-trip property).

### Requirement 6: Display Conversion for Frontend

**User Story:** As a developer, I want the frontend to derive display dates from BrightDateValue, so that the UI shows locale-appropriate dates while BrightDate remains the source of truth.

#### Acceptance Criteria

1. THE Frontend_Library SHALL provide a `useBrightDateDisplay(value: BrightDateValue)` hook that returns both a locale-formatted string and the BrightDate string representation.
2. WHEN a BrightDateValue is displayed in the UI, THE Frontend_Library SHALL show the BrightDate representation as the primary format.
3. WHERE the user prefers Traditional_Date display, THE Frontend_Library SHALL derive the locale date from the stored BrightDateValue using the Conversion_Utility.
4. THE Frontend_Library SHALL accept `BrightDateValue` directly in all date-display components without requiring pre-conversion by the caller.

### Requirement 7: API Response DTO Pattern

**User Story:** As a developer, I want API responses to carry BrightDateValue timestamps with optional Traditional_Date representations, so that clients can consume whichever format they need.

#### Acceptance Criteria

1. THE API_Library SHALL define response DTOs that include BrightDateTimestamp fields as the primary timestamp representation.
2. WHERE a client requests Traditional_Date format, THE API_Library SHALL include an additional field with the ISO 8601 string derived from the BrightDateValue.
3. THE API_Library SHALL use a generic DTO pattern such that `IBaseResponse<TTimestamp = BrightDateTimestamp>` allows parameterization for different client needs.
4. WHEN the API receives a request containing a Traditional_Date timestamp, THE API_Library SHALL convert it to BrightDateValue before processing.

### Requirement 8: Database Storage as BrightDate

**User Story:** As a developer, I want the database layer to store timestamps as BrightDateValue (numeric), so that temporal queries operate on the native format without conversion overhead.

#### Acceptance Criteria

1. THE System SHALL store all Timestamp_Fields in the database as numeric values representing BrightDateValue.
2. WHEN querying by time range, THE System SHALL accept BrightDateValue parameters for range boundaries.
3. WHEN migrating existing data, THE System SHALL convert stored Traditional_Date values to BrightDateValue using the Conversion_Utility.
4. THE System SHALL index BrightDateValue timestamp columns for efficient temporal queries.

### Requirement 9: Sorting and Comparison Operations

**User Story:** As a developer, I want all temporal sorting and comparison to operate directly on BrightDateValue, so that no date parsing is needed for ordering operations.

#### Acceptance Criteria

1. WHEN sorting records by time, THE System SHALL compare BrightDateValue fields using standard numeric comparison.
2. THE System SHALL provide a `compareBrightDates(a: BrightDateValue, b: BrightDateValue): number` utility that returns negative, zero, or positive values for before, equal, and after respectively.
3. WHEN determining if a timestamp is within a range, THE System SHALL use numeric comparison on BrightDateValue without converting to Traditional_Date.
4. FOR ALL pairs of BrightDateValue (a, b), comparing a and b SHALL produce the same ordering as comparing their equivalent Traditional_Date representations (metamorphic property).

### Requirement 10: Clean Migration of Existing Interfaces

**User Story:** As a developer, I want all existing interfaces to be updated in-place to use BrightDateValue, so that there is no legacy date code to maintain.

#### Acceptance Criteria

1. WHEN migrating an existing interface, THE Shared_Library SHALL replace `Date` and `string` timestamp fields directly with `BrightDateTimestamp`.
2. THE System SHALL remove all legacy Traditional_Date timestamp fields from interfaces without providing backward-compatible overloads.
3. WHEN an existing service references a migrated interface, THE Service SHALL be updated to use BrightDateValue for all timestamp operations.
4. THE System SHALL provide a `normalizeToBrightDate(input: BrightDateValue | Date | string): BrightDateValue` utility solely for ingesting external data that arrives as Traditional_Date.
