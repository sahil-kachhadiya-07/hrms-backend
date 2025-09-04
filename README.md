# HRMS Backend API

A comprehensive Human Resource Management System backend built with Node.js, Express.js, and MongoDB.

## Features

- 🔐 **Authentication System**: JWT-based authentication with role-based access control
- 👥 **User Management**: Support for HR and Interviewer roles
- 🤖 **AI Integration**: Google Gemini AI for job post generation and HR automation
- 🛡️ **Security**: Password hashing, input validation, and security headers
- 📊 **Database**: MongoDB with Mongoose ODM
- 🚀 **Modern Architecture**: Clean folder structure with separation of concerns

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors
- **AI**: Google Gemini 1.5 Flash (FREE)

## Project Structure

```
backend/
├── config/
│   └── database.config.js      # Database connection configuration
├── controllers/
│   └── auth.controller.js       # Authentication controllers
├── middleware/
│   ├── auth.middleware.js       # JWT authentication middleware
│   └── validation.middleware.js # Input validation middleware
├── models/
│   └── user.model.js           # User data model
├── routes/
│   └── auth.routes.js          # Authentication routes
├── services/
│   └── auth.service.js         # Authentication business logic
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies
├── README.md                   # Project documentation
└── server.js                   # Main application entry point
```

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_ATLAS_URI=mongodb://localhost:27017/hrms_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# CORS Configuration

# Google Gemini AI Configuration (FREE)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start the Server

```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication Routes

All authentication routes are prefixed with `/api/auth`

#### Sign Up
- **POST** `/api/auth/signup`
- **Description**: Register a new user
- **Access**: Public

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123",
  "role": "hr"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "hr",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Sign In
- **POST** `/api/auth/signin`
- **Description**: Authenticate user and get token
- **Access**: Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "hr",
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Get Profile
- **GET** `/api/auth/profile`
- **Description**: Get current user profile
- **Access**: Private (requires JWT token)

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "user_id",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "hr",
    "isActive": true,
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Verify Token
- **GET** `/api/auth/verify`
- **Description**: Verify token validity
- **Access**: Private (requires JWT token)

#### Logout
- **POST** `/api/auth/logout`
- **Description**: Logout user (client-side token removal)
- **Access**: Private (requires JWT token)

### Role-Based Access Examples

#### HR Only Endpoint
- **GET** `/api/auth/hr-only`
- **Description**: Example endpoint accessible only by HR users
- **Access**: Private (HR role required)

#### Interviewer Only Endpoint
- **GET** `/api/auth/interviewer-only`
- **Description**: Example endpoint accessible only by Interviewer users
- **Access**: Private (Interviewer role required)

#### Staff Only Endpoint
- **GET** `/api/auth/staff-only`
- **Description**: Example endpoint accessible by both HR and Interviewer users
- **Access**: Private (HR or Interviewer role required)

## User Roles

The system supports two user roles:

- **hr**: Human Resource personnel with administrative privileges
- **interviewer**: Interview conductors with limited access

## Validation Rules

### Sign Up Validation
- **Username**: 3-30 characters, alphanumeric and underscores only
- **Email**: Valid email format
- **Password**: Minimum 6 characters, must contain uppercase, lowercase, and number
- **Role**: Must be either 'hr' or 'interviewer'

### Sign In Validation
- **Email**: Valid email format
- **Password**: Required

## Security Features

- Password hashing using bcryptjs with salt rounds of 12
- JWT token-based authentication
- Input validation and sanitization
- CORS protection
- Security headers with helmet
- Role-based access control
- Active user status checking

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors array when applicable
}
```

## AI Features (Powered by Google Gemini)

### Job Post Generation
- **POST** `/api/jobs/:id/job-post`
- **Description**: Generate professional job posts using AI
- **Features**: 
  - Automatic content generation based on job title and description
  - Company information integration
  - Professional formatting
  - Image prompt generation for social media

### Available AI Services
- **Job Post Generation**: Create engaging job postings
- **Job Description Enhancement**: Improve existing descriptions
- **Interview Question Generation**: Generate relevant interview questions
- **Resume Analysis**: Automated CV screening against job criteria

### Setup AI Features
1. Get your free Gemini API key at https://makersuite.google.com/app/apikey
2. Add `GEMINI_API_KEY=your_key_here` to your `.env` file
3. Test with `npm run test:gemini`

See `GEMINI_SETUP.md` for detailed configuration guide.

## Health Check

- **GET** `/api/health`
- **Description**: Check API health status
- **Access**: Public

## Development

### Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with nodemon
- `npm test`: Run tests (placeholder)
- `npm run test:gemini`: Test Gemini AI integration

### Adding New Routes

1. Create controller in `controllers/`
2. Create service in `services/`
3. Create routes in `routes/`
4. Add route to `server.js`

### Database Models

Models follow the naming convention: `modelname.model.js`

### Services

Services contain business logic and follow the naming convention: `servicename.service.js`

### Controllers

Controllers handle HTTP requests/responses and follow the naming convention: `controllername.controller.js`

## Contributing

1. Follow the existing folder structure
2. Use functional programming approach (as per user preference)
3. Follow the naming conventions
4. Add proper validation and error handling
5. Update documentation for new endpoints

## License

ISC License
