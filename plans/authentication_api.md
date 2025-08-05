# Authentication API Reference

This document describes all authentication-related API endpoints available in the Evocable backend system. The authentication system supports user-based login with email/password credentials and JWT session tokens.

## Overview

The authentication system provides:
- **User Registration**: Create new user accounts with email verification
- **Email/Password Authentication**: Secure login with session tokens
- **Profile Management**: View and update user profiles
- **Password Management**: Change passwords and reset forgotten passwords
- **Session Management**: Token refresh and logout functionality

All authenticated endpoints require a valid session token in the `Authorization` header:
```
Authorization: Bearer <session_token>
```

## Rate Limiting

Authentication endpoints have specific rate limits to prevent abuse:
- Registration: 3 attempts per hour (100/minute in debug mode)
- Login: 5 attempts per minute (100/minute in debug mode)
- Password operations: 5 attempts per hour (50/minute in debug mode)
- Profile updates: 10 attempts per minute (100/minute in debug mode)

---

## User Registration

### `POST /auth/register`

Register a new user account with email and password.

#### Request Body
```json
{
  "username": "johndoe",
  "email": "john@example.com", 
  "password": "MySecurePass123!",
  "confirm_password": "MySecurePass123!"
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username (3-50 chars, alphanumeric, underscore, hyphen only) |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Strong password (see requirements below) |
| `confirm_password` | string | Yes | Password confirmation (must match password) |

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

#### Response (201 Created)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "johndoe",
  "email": "john@example.com",
  "is_active": true,
  "is_verified": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### Error Responses
- **400 Bad Request**: Username or email already exists
- **422 Unprocessable Entity**: Validation error (weak password, invalid format, etc.)

---

## User Authentication

### `POST /auth/login/email`

Authenticate with email and password to receive a session token.

#### Request Body
```json
{
  "email": "john@example.com",
  "password": "MySecurePass123!",
  "remember": false
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |
| `remember` | boolean | No | Extend session to 30 days (default: 24 hours) |

#### Response (200 OK)
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-16T10:30:00Z",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "johndoe"
  }
}
```

#### Error Responses
- **401 Unauthorized**: Invalid email or password, or account deactivated
- **422 Unprocessable Entity**: Invalid request format

---

## Profile Management

### `GET /auth/profile`

Get the current user's profile information.

#### Headers
```
Authorization: Bearer <session_token>
```

#### Response (200 OK)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "johndoe",
  "email": "john@example.com",
  "is_active": true,
  "is_verified": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:45:00Z"
}
```

#### Error Responses
- **401 Unauthorized**: Invalid or expired token
- **404 Not Found**: User not found

### `PUT /auth/profile`

Update the current user's profile information.

#### Headers
```
Authorization: Bearer <session_token>
```

#### Request Body
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | No | New username (3-50 chars, alphanumeric, underscore, hyphen only) |
| `email` | string | No | New email address |

*Note: Both fields are optional. Include only the fields you want to update.*

#### Response (200 OK)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "newusername",
  "email": "newemail@example.com",
  "is_active": true,
  "is_verified": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:45:00Z"
}
```

#### Error Responses
- **400 Bad Request**: Username or email already exists
- **401 Unauthorized**: Invalid or expired token
- **422 Unprocessable Entity**: Validation error

---

## Password Management

### `POST /auth/change-password`

Change the current user's password.

#### Headers
```
Authorization: Bearer <session_token>
```

#### Request Body
```json
{
  "current_password": "CurrentPass123!",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_password` | string | Yes | Current password for verification |
| `new_password` | string | Yes | New password (must meet strength requirements) |
| `confirm_password` | string | Yes | New password confirmation |

#### Response (200 OK)
```json
{
  "message": "Password changed successfully"
}
```

#### Error Responses
- **400 Bad Request**: Current password is incorrect
- **401 Unauthorized**: Invalid or expired token
- **422 Unprocessable Entity**: Password validation failed

### `POST /auth/forgot-password`

Request a password reset token for the given email address.

#### Request Body
```json
{
  "email": "john@example.com"
}
```

#### Response (200 OK)
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

*Note: The response is always the same regardless of whether the email exists, for security reasons.*

#### Error Responses
- **422 Unprocessable Entity**: Invalid email format

### `POST /auth/reset-password`

Reset password using a valid reset token.

#### Request Body
```json
{
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reset_token` | string | Yes | Password reset token (expires in 15 minutes) |
| `new_password` | string | Yes | New password (must meet strength requirements) |
| `confirm_password` | string | Yes | New password confirmation |

#### Response (200 OK)
```json
{
  "message": "Password reset successfully"
}
```

#### Error Responses
- **400 Bad Request**: Invalid or expired reset token
- **422 Unprocessable Entity**: Password validation failed

---

## Session Management

### `POST /auth/refresh`

Refresh a session token to extend its validity.

#### Headers
```
Authorization: Bearer <session_token>
```

#### Response (200 OK)
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-16T10:30:00Z",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "johndoe"
  }
}
```

#### Error Responses
- **401 Unauthorized**: Invalid or expired token

### `POST /auth/logout`

Logout user and invalidate session token.

#### Headers
```
Authorization: Bearer <session_token>
```

#### Response (200 OK)
```json
{
  "message": "Successfully logged out"
}
```

#### Error Responses
- **500 Internal Server Error**: Logout failed

---

## Authentication Models

### UserProfile
Complete user profile information returned by profile endpoints.

```json
{
  "id": "string",
  "username": "string",
  "email": "string", 
  "is_active": "boolean",
  "is_verified": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### User
Basic user information returned in authentication responses.

```json
{
  "id": "string",
  "username": "string"
}
```

### LoginResponse
Response structure for successful authentication.

```json
{
  "sessionToken": "string",
  "expiresAt": "string",
  "user": "User"
}
```

---

## Security Features

### JWT Token Structure
Session tokens are JWT tokens with the following claims:
- `sub`: User ID
- `username`: Username
- `exp`: Expiration timestamp
- `iat`: Issued at timestamp
- `jti`: Unique token ID
- `type`: Token type ("session" or "password_reset")

### Token Expiration
- **Default session**: 24 hours
- **Remember me session**: 30 days
- **Password reset token**: 15 minutes

### Password Security
- Passwords are hashed using secure algorithms before storage
- Password strength validation enforced on all password inputs
- Current password verification required for password changes

### Rate Limiting
All authentication endpoints implement rate limiting to prevent brute force attacks and abuse.

### Error Handling
- Consistent error response format
- No sensitive information leaked in error messages
- Security-focused error messages (e.g., "email sent" regardless of email existence)