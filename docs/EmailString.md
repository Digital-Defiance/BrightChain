# EmailString

## Overview

The `EmailString` class represents a validated email address. It ensures that the email is not empty, does not have leading or trailing spaces, and is a valid email format.

## Methods

### Constructor

- **Purpose**: Creates an instance of `EmailString`.
- **Parameters**:
  - `email` (string): The email address to validate and store.
- **Throws**: Will throw an error if the email is invalid.
- **Example**:
  ```typescript
  const email = new EmailString('test@example.com');
  ```

### toString

- **Purpose**: Returns the email address as a string.
- **Returns**: The email address.
- **Example**:
  ```typescript
  const email = new EmailString('test@example.com');
  console.log(email.toString()); // Output: test@example.com
  ```

### equals

- **Purpose**: Checks if this email address is equal to another email address.
- **Parameters**:
  - `other` (EmailString): The other email address to compare.
- **Returns**: True if the email addresses are equal, false otherwise.
- **Example**:
  ```typescript
  const email1 = new EmailString('test@example.com');
  const email2 = new EmailString('test@example.com');
  console.log(email1.equals(email2)); // Output: true
  ```

### toJson

- **Purpose**: Converts the email address to a JSON string.
- **Returns**: The email address as a JSON string.
- **Example**:
  ```typescript
  const email = new EmailString('test@example.com');
  console.log(email.toJson()); // Output: "test@example.com"
  ```

### fromJson

- **Purpose**: Creates an `EmailString` instance from a JSON string.
- **Parameters**:
  - `email` (string): The JSON string representing the email address.
- **Returns**: The `EmailString` instance.
- **Example**:
  ```typescript
  const email = EmailString.fromJson('"test@example.com"');
  ```

### length

- **Purpose**: Gets the length of the email address.
- **Returns**: The length of the email address.
- **Example**:
  ```typescript
  const email = new EmailString('test@example.com');
  console.log(email.length); // Output: 18
  ```

## Conclusion

The `EmailString` class provides a robust way to handle and validate email addresses, ensuring that they meet the required criteria before being stored or used in the application.
