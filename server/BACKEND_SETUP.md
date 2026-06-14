# LifeTwin Backend - Setup & Architecture Guide

## ✅ Setup Complete

Your professional, scalable backend is ready! This guide explains the architecture and best practices.

---

## 📁 Project Structure

```
server/
├── config/                          # Configuration files
│   ├── database.js                  # MongoDB connection
│   └── firebase.js                  # Firebase Admin SDK
│
├── middleware/                      # Express middleware
│   ├── auth.js                      # JWT authentication
│   ├── cors.js                      # CORS configuration
│   └── errorHandler.js              # Error handling
│
├── models/                          # MongoDB/Mongoose schemas
│   └── User.js                      # User model & schema
│
├── controllers/                     # Business logic
│   └── authController.js            # Auth endpoints logic
│
├── routes/                          # API routes
│   └── auth.js                      # Auth API routes
│
├── utils/                           # Helper functions
│   └── helpers.js                   # Utility functions
│
├── server.js                        # Main server file
├── package.json                     # Dependencies
├── .env.example                     # Environment template
└── .gitignore                       # Git ignore rules
```

---

## 🔧 Configuration Files

### 1. **config/database.js**
Handles MongoDB connection with Mongoose.

**Functions:**
- `connectDB()` - Connects to MongoDB
- `disconnectDB()` - Closes connection

**Usage in server.js:**
```javascript
await connectDB();
```

**Environment Variable:**
```
MONGODB_URI=mongodb://localhost:27017/lifetwin
```

---

### 2. **config/firebase.js**
Initializes Firebase Admin SDK for authentication and services.

**Functions:**
- `initializeFirebase()` - Sets up Firebase
- `verifyFirebaseToken(token)` - Validates Firebase tokens

**Environment Variables:**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

---

## 🔐 Middleware Explained

### 1. **middleware/auth.js**
JWT Authentication middleware for protecting routes.

**Functions:**
- `authenticateToken` - Middleware to verify JWT
- `generateToken(userId, email)` - Creates JWT token

**Usage:**
```javascript
router.get('/protected', authenticateToken, controller);
```

**How it works:**
1. Client sends request with `Authorization: Bearer <token>` header
2. Middleware extracts token
3. Token is verified using JWT_SECRET
4. User info is attached to `req.user`
5. Controller can access `req.user.userId` and `req.user.email`

---

### 2. **middleware/cors.js**
Cross-Origin Resource Sharing configuration.

**Allows requests from:**
- Frontend URLs specified in `.env` CORS_ORIGIN
- Default: http://localhost:5173 (Vite dev server)

**Environment Variable:**
```
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

---

### 3. **middleware/errorHandler.js**
Global error handling for the application.

**Features:**
- `errorHandler` - Catches all errors and formats responses
- `notFoundHandler` - Handles 404 routes
- `asyncHandler` - Wraps async functions for error catching

**Usage:**
```javascript
// Wrap async controller functions
router.post('/login', asyncHandler(loginController));
```

---

## 📊 Database Models

### **models/User.js**
Complete user schema with best practices.

**Fields:**
- **Basic Info**: firstName, lastName, email, password
- **Profile**: profilePhoto, bio, phone
- **Subscription**: role, subscriptionTier, subscriptionDates
- **Security**: isVerified, isActive, lastLogin, failedLoginAttempts
- **Metadata**: preferences, timestamps

**Methods:**
- `comparePassword()` - Verify password hash
- `getProfile()` - Return user without sensitive data
- `isLocked()` - Check if account is locked

**Security Features:**
- Passwords are hashed with bcryptjs before saving
- Account lockout after 5 failed login attempts
- Sensitive fields excluded from queries by default
- Timestamps for audit trail

---

## 🎯 Controllers

### **controllers/authController.js**
Handles all authentication business logic.

**Functions:**
1. **signup** - Register new user
2. **login** - Authenticate user
3. **getProfile** - Retrieve user profile
4. **updateProfile** - Update user information
5. **changePassword** - Change account password

**Request/Response Format:**
```javascript
// Request
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securepass123"
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 🛣️ API Routes

### **routes/auth.js**

#### Public Routes

**POST /api/auth/signup**
- Register new user
- Body: `{ firstName, lastName, email, password, confirmPassword }`
- Returns: User + JWT token

**POST /api/auth/login**
- Authenticate user
- Body: `{ email, password }`
- Returns: User + JWT token

#### Protected Routes (Require JWT Token)

**GET /api/auth/profile**
- Get logged-in user's profile
- Header: `Authorization: Bearer <token>`

**PUT /api/auth/profile**
- Update user profile
- Body: `{ firstName, lastName, bio, phone, language, timezone, notifications }`

**POST /api/auth/change-password**
- Change password
- Body: `{ oldPassword, newPassword, confirmPassword }`

---

## 🚀 Running the Server

### Development Mode (with hot reload)
```bash
npm run dev
```
Uses `nodemon` to restart on file changes.

### Production Mode
```bash
npm start
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Update all values with your configuration:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/lifetwin
   JWT_SECRET=your-very-secret-key-change-in-production
   JWT_EXPIRE=7d
   CORS_ORIGIN=http://localhost:5173
   ```

---

## 🏗️ Scalable Architecture Best Practices

### 1. **Separation of Concerns**
- **Routes**: Define endpoints only
- **Controllers**: Handle business logic
- **Models**: Define data schema
- **Middleware**: Handle cross-cutting concerns

### 2. **Error Handling**
```javascript
// Use asyncHandler wrapper for all async controllers
router.post('/endpoint', asyncHandler(async (req, res) => {
  // Errors automatically caught and passed to errorHandler
}));
```

### 3. **Authentication Flow**
```
Client sends credentials
    ↓
Login Controller validates
    ↓
Password hash verified
    ↓
JWT token generated
    ↓
Token sent to client
    ↓
Client stores token (localStorage/sessionStorage)
    ↓
Client sends token in Authorization header
    ↓
authenticateToken middleware verifies
    ↓
Protected route can access req.user
```

### 4. **Database Best Practices**
- Use indexes for frequently queried fields
- Implement soft deletes (isActive field)
- Use timestamps for audit trail
- Hash sensitive data before storing
- Validate data at schema level

### 5. **Security**
- Helmet.js for HTTP headers
- CORS properly configured
- Passwords hashed with bcryptjs
- JWT for stateless authentication
- Rate limiting (TODO - add express-rate-limit)
- Input validation at controller level

### 6. **Environment Management**
- Use `.env` for configuration
- Never commit `.env` file
- Provide `.env.example` template
- Use `dotenv` package for loading

---

## 🧪 Testing the API

### Using cURL

**Signup:**
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Profile (Protected):**
```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Using Postman
1. Create a new collection "LifeTwin API"
2. Add requests for each endpoint
3. Set `Authorization` header with Bearer token
4. Test endpoints sequentially

---

## 📈 Extending the Backend

### Adding a New Entity

1. **Create Model** (`models/YourEntity.js`)
   - Define schema
   - Add validation
   - Add methods

2. **Create Controller** (`controllers/yourEntityController.js`)
   - Implement CRUD operations
   - Add business logic
   - Handle errors with asyncHandler

3. **Create Routes** (`routes/yourEntity.js`)
   - Define endpoints
   - Apply middleware (auth, validation)
   - Use asyncHandler

4. **Register Routes** (in `server.js`)
   ```javascript
   app.use('/api/your-entity', yourEntityRoutes);
   ```

---

## 🔍 Common Issues & Solutions

### MongoDB Connection Error
- Check MONGODB_URI in .env
- Ensure MongoDB is running locally or Atlas is accessible
- Verify network IP whitelist for MongoDB Atlas

### JWT Token Expired
- Tokens expire based on JWT_EXPIRE setting (default: 7d)
- Implement refresh token rotation for better security

### CORS Error
- Verify CORS_ORIGIN includes your frontend URL
- Separate multiple origins with comma: `http://localhost:5173,http://localhost:3000`

### Firebase Not Initializing
- Check Firebase credentials in .env
- Firebase is optional - backend works without it
- Remove Firebase initialization if not needed

---

## 📚 Next Steps

1. **Connect Frontend**: Point React app to http://localhost:5001
2. **Add More Features**:
   - Email verification
   - Password reset
   - Social authentication
   - User roles & permissions
   - Data models for AI features

3. **Deployment**:
   - Use MongoDB Atlas for cloud database
   - Deploy to Heroku, AWS, or DigitalOcean
   - Set environment variables on hosting platform

4. **Monitoring**:
   - Add logging with Winston
   - Setup error tracking with Sentry
   - Monitor performance metrics

---

## 🎓 Key Technologies

| Technology | Purpose |
|-----------|---------|
| **Express.js** | Web framework |
| **MongoDB** | NoSQL database |
| **Mongoose** | MongoDB ODM |
| **JWT** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Firebase Admin** | Firebase services |
| **Helmet.js** | Security headers |
| **CORS** | Cross-origin handling |
| **Dotenv** | Environment variables |
| **Nodemon** | Development hot reload |

---

## ✨ Your Backend is Production-Ready!

With this setup, you have:
✅ Scalable folder structure
✅ Proper separation of concerns
✅ JWT authentication
✅ Error handling
✅ CORS configuration
✅ MongoDB integration
✅ Firebase support
✅ Security best practices
✅ Hot reload development
✅ Sample auth endpoints

**Ready to build your AI SaaS! 🚀**
