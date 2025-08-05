# Frontend Authentication Migration Plan

## Current State
- Uses API key authentication (`apiKey` field in login form)
- Current endpoints: `/auth/login`, `/auth/logout`, `/auth/refresh`
- User object: `{ id, permissions[] }`
- Auth stored as `evocable_api_key` in localStorage

## New API Requirements
- Email/password authentication 
- New endpoints: `/auth/login/email`, `/auth/register`, `/auth/profile`, etc.
- User object: `{ id, username }` (login) vs `{ id, username, email, is_active, is_verified, created_at, updated_at }` (profile)
- JWT session tokens with 24hr/30day expiry

## What Doesn't Need Changes ✅
- **Books API calls** - all use apiClient, will work automatically
- **Audio API calls** - all use apiClient, will work automatically  
- **Any request using apiClient.get/post/put/delete** - automatic auth headers
- **Authorization header format** - still `Bearer ${token}`, just different token content

## What Needs Updates ⚠️

### 1. Update Authentication Types
**File:** `src/types/auth.ts`
- Change `LoginRequest`: `{ apiKey, remember }` → `{ email, password, remember }`
- Update `User`: `{ id, permissions[] }` → `{ id, username }`
- Add `UserProfile`: `{ id, username, email, is_active, is_verified, created_at, updated_at }`
- Add new interfaces: `RegisterRequest`, `ChangePasswordRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`
- Update `AuthError` types for new validation errors

### 2. Refactor AuthService
**File:** `src/lib/auth/authService.ts`
- Update `login()`: endpoint `/auth/login` → `/auth/login/email`
- Add `register()`: `POST /auth/register`
- Add `getProfile()`: `GET /auth/profile`
- Add `updateProfile()`: `PUT /auth/profile`
- Add `changePassword()`: `POST /auth/change-password`
- Add `forgotPassword()`: `POST /auth/forgot-password`
- Add `resetPassword()`: `POST /auth/reset-password`
- Update error mapping for new API codes

### 3. Update Login Form
**File:** `src/components/features/auth/LoginForm.tsx`
- Replace API key input with email + password fields
- Add password visibility toggle
- Add links to registration and forgot password
- Update form validation
- Change submission to use `{ email, password, remember }`

### 4. Create Registration Form
**File:** `src/components/features/auth/RegistrationForm.tsx`
- Form fields: username, email, password, confirm_password
- Password strength validation with visual feedback
- Form validation using react-hook-form + Zod
- Handle registration success/error states

### 5. Create Profile Management
**Files:** 
- `src/components/features/auth/ProfileForm.tsx`
- `src/components/features/auth/ProfilePage.tsx`
- Display user profile information
- Edit username and email
- Show account status and timestamps

### 6. Create Password Management
**Files:**
- `src/components/features/auth/ChangePasswordForm.tsx`
- `src/components/features/auth/ForgotPasswordForm.tsx`
- `src/components/features/auth/ResetPasswordForm.tsx`
- Current password verification
- Email-based password reset flow
- Password strength validation

### 7. Set Up Routes
**Files:** App Router pages in `src/app/`
- `/register` - RegistrationForm
- `/profile` - ProfilePage (authenticated)
- `/forgot-password` - ForgotPasswordForm  
- `/reset-password` - ResetPasswordForm
- Update RouteGuard for new auth state

### 8. Add Form Validation
- Create Zod schemas for all forms
- Email validation
- Password requirements: 8+ chars, uppercase, lowercase, number, special char
- Username: 3-50 chars, alphanumeric + underscore/hyphen
- Integrate with react-hook-form

### 9. Fix Upload Auth
**File:** `src/hooks/useUpload.ts` (lines 98-100)
- Remove manual auth header: `'Authorization': \`Bearer ${apiClient.getAuthToken()}\``
- Use apiClient.upload() method instead of manual fetch

### 10. Fix Client Initialization
**File:** `src/lib/api/client.ts` (lines 594-608)
- Remove: `localStorage.getItem('evocable_api_key')`
- Update to load JWT tokens from AuthService session
- Remove development API key fallback

### 11. Update Error Handling
- Map new API error codes (400, 401, 422) to user messages
- Handle rate limiting errors
- Registration conflict errors (email/username exists)

### 12. Clean Up Legacy Code
- Remove `src/lib/auth/simple-auth.ts`
- Remove API key references
- Update localStorage keys from `evocable_api_key` to `audiobook_session`

## Implementation Order
1. Update types and interfaces
2. Refactor AuthService with new endpoints
3. Fix API client initialization
4. Update login form to email/password
5. Create registration form
6. Create profile management
7. Create password management  
8. Set up routing
9. Add form validation
10. Fix upload auth bug
11. Update error handling
12. Clean up old code

## Validation Requirements
- Email: Valid email format
- Password: Min 8 chars, uppercase, lowercase, number, special char
- Username: 3-50 chars, alphanumeric + underscore/hyphen only
- Rate limiting: Registration (3/hr), Login (5/min), Password ops (5/hr)

## Session Management
- Default: 24 hours
- Remember me: 30 days
- Auto-refresh: 5 minutes before expiry
- Password reset tokens: 15 minutes