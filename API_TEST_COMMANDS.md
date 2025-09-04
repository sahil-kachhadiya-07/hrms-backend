# Testing Interviewers API

## Get Interviewers Endpoint

### Prerequisites
1. Start the backend server: `npm run dev`
2. Make sure you have at least one user with role 'interviewer' in the database
3. Get a valid JWT token by signing in

### Test Command

```bash
# Replace YOUR_JWT_TOKEN with actual token from signin response
curl -X GET http://localhost:5000/api/auth/interviewers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Expected Response
```json
{
  "success": true,
  "message": "Interviewers retrieved successfully",
  "data": [
    {
      "id": "65f1234567890123456789ab",
      "username": "john_interviewer",
      "email": "john@example.com"
    },
    {
      "id": "65f1234567890123456789cd",
      "username": "jane_interviewer", 
      "email": "jane@example.com"
    }
  ]
}
```

### Create Test Interviewer Users

If you don't have interviewer users, create them using the signup endpoint:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_interviewer",
    "email": "john@example.com",
    "password": "Password123",
    "role": "interviewer"
  }'
```

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_interviewer", 
    "email": "jane@example.com",
    "password": "Password123",
    "role": "interviewer"
  }'
```
