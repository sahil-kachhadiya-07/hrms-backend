# HRMS Backend API - CURL Commands

This document contains CURL commands for testing all API endpoints in the HRMS backend.

## Base URL
```
http://localhost:5000
```

## 1. Health Check

### Check API Health
```bash
curl -X GET http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "HRMS Backend API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 2. Authentication APIs

### Sign Up (Register New User)

#### Register HR User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hr_admin",
    "email": "hr@company.com",
    "password": "HRPassword123",
    "role": "hr"
  }'
```

#### Register Interviewer User
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "interviewer_john",
    "email": "john.interviewer@company.com",
    "password": "InterviewPassword123",
    "role": "interviewer"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id_here",
      "username": "hr_admin",
      "email": "hr@company.com",
      "role": "hr",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

### Sign In (Login)

#### Login with Email and Password
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "HRPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id_here",
      "username": "hr_admin",
      "email": "hr@company.com",
      "role": "hr",
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

---

## 3. Protected APIs (Require JWT Token)

> **Note:** Replace `YOUR_JWT_TOKEN` with the actual token received from login response.

### Get User Profile
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "user_id_here",
    "username": "hr_admin",
    "email": "hr@company.com",
    "role": "hr",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Verify Token
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "user_id_here",
      "username": "hr_admin",
      "email": "hr@company.com",
      "role": "hr",
      "isActive": true
    }
  }
}
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 4. Role-Based Access APIs

### HR Only Endpoint
```bash
curl -X GET http://localhost:5000/api/auth/hr-only \
  -H "Authorization: Bearer YOUR_HR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "This is an HR-only endpoint",
  "user": {
    "id": "user_id_here",
    "username": "hr_admin",
    "email": "hr@company.com",
    "role": "hr",
    "isActive": true
  }
}
```

### Interviewer Only Endpoint
```bash
curl -X GET http://localhost:5000/api/auth/interviewer-only \
  -H "Authorization: Bearer YOUR_INTERVIEWER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "This is an interviewer-only endpoint",
  "user": {
    "id": "user_id_here",
    "username": "interviewer_john",
    "email": "john.interviewer@company.com",
    "role": "interviewer",
    "isActive": true
  }
}
```

### Staff Only Endpoint (HR or Interviewer)
```bash
curl -X GET http://localhost:5000/api/auth/staff-only \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "This endpoint is accessible by HR and Interviewers",
  "user": {
    "id": "user_id_here",
    "username": "hr_admin",
    "email": "hr@company.com",
    "role": "hr",
    "isActive": true
  }
}
```

---

## 5. Error Response Examples

### Invalid Credentials
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@email.com",
    "password": "wrongpassword"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Validation Error
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "email": "invalid-email",
    "password": "123",
    "role": "invalid_role"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Username must be between 3 and 30 characters",
      "param": "username",
      "location": "body"
    },
    {
      "msg": "Please provide a valid email address",
      "param": "email",
      "location": "body"
    },
    {
      "msg": "Password must be at least 6 characters long",
      "param": "password",
      "location": "body"
    },
    {
      "msg": "Role must be either hr or interviewer",
      "param": "role",
      "location": "body"
    }
  ]
}
```

### Unauthorized Access
```bash
curl -X GET http://localhost:5000/api/auth/profile
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Access denied. No token provided or invalid format."
}
```

### Insufficient Permissions
```bash
curl -X GET http://localhost:5000/api/auth/hr-only \
  -H "Authorization: Bearer INTERVIEWER_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Access denied. Required role(s): hr"
}
```

---

## 6. Testing Workflow

### Complete Testing Sequence
```bash
# 1. Check API health
curl -X GET http://localhost:5000/api/health

# 2. Register HR user
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_hr",
    "email": "test.hr@company.com",
    "password": "TestPassword123",
    "role": "hr"
  }'

# 3. Login with HR user (save the token from response)
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.hr@company.com",
    "password": "TestPassword123"
  }'

# 4. Get profile using token
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 5. Test HR-only endpoint
curl -X GET http://localhost:5000/api/auth/hr-only \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 6. Register interviewer user
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_interviewer",
    "email": "test.interviewer@company.com",
    "password": "TestPassword123",
    "role": "interviewer"
  }'

# 7. Login with interviewer user
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.interviewer@company.com",
    "password": "TestPassword123"
  }'

# 8. Test interviewer-only endpoint
curl -X GET http://localhost:5000/api/auth/interviewer-only \
  -H "Authorization: Bearer INTERVIEWER_TOKEN_HERE"
```

---

## 7. Environment Variables Required

Make sure your `.env` file contains:
```env
PORT=5000
NODE_ENV=development
MONGODB_ATLAS_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

---

## 8. Common HTTP Status Codes

- **200**: Success
- **201**: Created (successful registration)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **409**: Conflict (user already exists)
- **404**: Not Found (endpoint not found)
- **500**: Internal Server Error

---

## 9. Tips for Testing

1. **Save Tokens**: After login, save the JWT token to use in subsequent requests
2. **Test Roles**: Create both HR and Interviewer users to test role-based access
3. **Validation**: Try invalid data to test validation rules
4. **Security**: Test without tokens to verify protection
5. **Use Tools**: Consider using Postman or Insomnia for easier API testing

## 10. Postman Collection

You can also import these commands into Postman by creating a new collection and adding each request with the appropriate headers and body data.
