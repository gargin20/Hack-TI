# LifeTwin Backend - API Quick Reference

## 🚀 Quick Start

```bash
# Create .env file from template
cp .env.example .env

# Update .env with your configuration
# MONGODB_URI=your-mongodb-connection
# JWT_SECRET=your-secret-key

# Start development server
npm run dev

# Server runs on http://localhost:5001
```

---

## 📡 API Endpoints

### Health Check
```
GET /api/health
Response: { success: true, message: "Server is running" }
```

---

## 🔐 Authentication Endpoints

### 1. Signup
```
POST /api/auth/signup

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "subscriptionTier": "free",
      "isActive": true,
      "createdAt": "2026-05-23T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Error (400): Email validation errors
Error (409): Email already registered
```

---

### 2. Login
```
POST /api/auth/login

Body:
{
  "email": "john@example.com",
  "password": "SecurePass123"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Error (401): Invalid credentials
Error (423): Account locked (after 5 failed attempts)
```

---

### 3. Get Profile (Protected)
```
GET /api/auth/profile

Headers:
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "success": true,
  "data": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "bio": "AI enthusiast",
    "phone": "+1234567890",
    "role": "user",
    "subscriptionTier": "free",
    "preferences": {
      "language": "en",
      "timezone": "UTC",
      "notifications": true
    },
    "createdAt": "2026-05-23T...",
    "updatedAt": "2026-05-23T..."
  }
}

Error (401): No token or invalid token
```

---

### 4. Update Profile (Protected)
```
PUT /api/auth/profile

Headers:
{
  "Authorization": "Bearer <token>"
}

Body (all fields optional):
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "AI & ML Enthusiast",
  "phone": "+1234567890",
  "language": "en",
  "timezone": "America/New_York",
  "notifications": true
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { /* updated user object */ }
}
```

---

### 5. Change Password (Protected)
```
POST /api/auth/change-password

Headers:
{
  "Authorization": "Bearer <token>"
}

Body:
{
  "oldPassword": "OldPassword123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully"
}

Error (401): Current password incorrect
Error (400): Password validation errors
```

---

## 🧪 Testing Commands

### Using cURL

**Signup:**
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john@example.com",
    "password":"password123",
    "confirmPassword":"password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"password123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Update Profile:**
```bash
curl -X PUT http://localhost:5001/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "firstName":"Jane",
    "bio":"Updated bio"
  }'
```

---

## 🔑 Environment Variables

```env
# Server
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lifetwin

# Authentication
JWT_SECRET=super_secret_key_change_in_production
JWT_EXPIRE=7d

# Firebase (optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email@firebase.com

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

---

## 🔄 Authentication Flow

```
1. User signs up or logs in
2. Server generates JWT token
3. Client stores token (localStorage/sessionStorage)
4. Client sends token in Authorization header for protected routes
5. Server verifies token with JWT_SECRET
6. If valid, request proceeds; if invalid, 403 Forbidden
7. Token expires based on JWT_EXPIRE setting
```

---

## 🛡️ Security Features

✅ Password hashing with bcryptjs
✅ JWT token authentication
✅ Account lockout after 5 failed attempts (30 minutes)
✅ CORS protection
✅ Helmet.js security headers
✅ MongoDB injection prevention
✅ XSS protection
✅ Rate limiting ready (add express-rate-limit)

---

## 🎯 HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful request |
| 201 | Created | User created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Token expired |
| 404 | Not Found | Route not found |
| 409 | Conflict | Email already exists |
| 423 | Locked | Account temporarily locked |
| 500 | Server Error | Internal error |

---

## 🚀 Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests (when added)
npm test

# View npm packages info
npm list

# Update dependencies
npm update
```

---

## 📋 File Structure Overview

```
server/
├── config/
│   ├── database.js        # MongoDB connection
│   └── firebase.js        # Firebase initialization
├── middleware/
│   ├── auth.js            # JWT auth middleware
│   ├── cors.js            # CORS middleware
│   └── errorHandler.js    # Error handling
├── models/
│   └── User.js            # User schema & methods
├── controllers/
│   └── authController.js  # Auth business logic
├── routes/
│   └── auth.js            # Auth routes
├── utils/
│   └── helpers.js         # Utility functions
├── server.js              # Main server file
├── package.json           # Dependencies
└── .env                   # Environment config (create from .env.example)
```

---

## 🔗 Integration with Frontend

### In React Component

```javascript
// Signup
const response = await fetch('http://localhost:5001/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  })
});
const data = await response.json();
localStorage.setItem('token', data.data.token);

// Login
const response = await fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
});
const data = await response.json();
localStorage.setItem('token', data.data.token);

// Protected Request
const response = await fetch('http://localhost:5001/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

---

## 💡 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Setup `.env` file from `.env.example`
3. ✅ Start MongoDB (local or Atlas)
4. ✅ Run server: `npm run dev`
5. ✅ Test endpoints with cURL or Postman
6. ✅ Connect React frontend
7. 📝 Add more features (email verification, password reset, etc.)
8. 🚀 Deploy to production

---

**Your backend is ready! Start building your AI SaaS! 🚀**
