# LifeTwin Backend - System Architecture & Flow Diagrams

## 🏗️ System Architecture

```
                          FRONTEND (React)
                                │
                                │ HTTP Requests
                                │ (with JWT token in headers)
                                │
                    ┌───────────▼────────────┐
                    │   VITE DEV SERVER     │
                    │  (http://localhost:5173)
                    └───────────┬────────────┘
                                │
                                │ API Calls
                                │
                    ┌───────────▼──────────────────────────┐
                    │   Express.js Server                 │
                    │  (http://localhost:5001)            │
                    └───────────┬──────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
         ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
         │   Routes    │ │Middleware │ │Controllers │
         │ (auth.js)   │ │(auth,cors)│ │ (authCtrl) │
         └──────┬──────┘ └─────┬─────┘ └─────┬──────┘
                │               │             │
                └───────────────┼─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Mongoose Models       │
                    │  (User.js)             │
                    │  - Schemas             │
                    │  - Validation          │
                    │  - Methods             │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   MongoDB              │
                    │  (Database)            │
                    │  - Local: localhost    │
                    │  - Cloud: Atlas        │
                    └───────────────────────┘
```

---

## 🔄 Request Flow Diagram

### Signup/Login Flow

```
1. USER SUBMITS FORM
   ┌─────────────────────────────────┐
   │ Frontend (React)                │
   │ - Validate input                │
   │ - Call /api/auth/signup         │
   └─────────────┬───────────────────┘
                 │ POST Request
                 ├─ Headers: Content-Type: application/json
                 ├─ Body: {firstName, lastName, email, password}
                 │
   ┌─────────────▼───────────────────┐
   │ Express Server                   │
   │ - Route: POST /api/auth/signup   │
   │ - Router matches request         │
   │ - Controller invoked             │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ Signup Controller                │
   │ 1. Validate input                │
   │ 2. Check if email exists         │
   │ 3. Create new User               │
   │ 4. Hash password (bcryptjs)      │
   │ 5. Save to MongoDB               │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ User Model (Mongoose)            │
   │ - Pre-save hook hashes password  │
   │ - Validation runs                │
   │ - Indexes checked                │
   │ - Save to MongoDB                │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ MongoDB                          │
   │ - Inserts new document           │
   │ - Returns saved user object      │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ Generate JWT Token               │
   │ - Payload: userId + email        │
   │ - Sign with JWT_SECRET           │
   │ - Expires in: JWT_EXPIRE         │
   │ - Return token to user           │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ Send Response to Frontend        │
   │ {                                │
   │   "success": true,               │
   │   "data": {                      │
   │     "user": {...},               │
   │     "token": "eyJ..."            │
   │   }                              │
   │ }                                │
   └─────────────┬───────────────────┘
                 │
   ┌─────────────▼───────────────────┐
   │ Frontend Stores Token            │
   │ - localStorage.setItem('token')  │
   │ - Redirect to dashboard          │
   └─────────────────────────────────┘
```

---

## 🔐 JWT Authentication Flow

```
1. USER HAS TOKEN (from login/signup)
   ┌──────────────────────────────────┐
   │ Frontend sends request to         │
   │ Protected Route (/api/auth/profile)
   │                                  │
   │ Headers: {                       │
   │   "Authorization":               │
   │   "Bearer eyJ0eXAiOiJK..."       │
   │ }                                │
   └──────────────┬───────────────────┘
                  │
   ┌──────────────▼───────────────────┐
   │ Express Server                    │
   │ Route middleware checks:          │
   │ Is this a protected route?        │
   │                                  │
   │ YES → Apply authenticateToken    │
   │ NO  → Continue to controller     │
   └──────────────┬───────────────────┘
                  │
   ┌──────────────▼───────────────────┐
   │ authenticateToken Middleware      │
   │                                  │
   │ 1. Extract header                │
   │ 2. Split "Bearer <token>"        │
   │ 3. Verify token with JWT_SECRET  │
   └──────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    VALID                 INVALID
      │                    │
   ┌──▼──────┐      ┌──────▼──────┐
   │Attach   │      │Return 403   │
   │user info│      │Forbidden    │
   │to req   │      └─────────────┘
   │req.user│
   │{       │
   │userId: │
   │email   │
   │}       │
   └──┬─────┘
      │
   ┌──▼──────────────────────┐
   │ Continue to Controller   │
   │ Can access req.user      │
   │ Controller logic runs    │
   │ Return response          │
   └──────────────────────────┘
```

---

## 📊 Database Schema Visualization

```
┌─────────────────────────────────────────────────────────┐
│                    User Document                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  _id: ObjectId                                          │
│                                                          │
│  BASIC INFORMATION                                      │
│  ├─ firstName: String (required)                        │
│  ├─ lastName: String (required)                         │
│  ├─ email: String (required, unique)                    │
│  └─ password: String (hashed, required)                 │
│                                                          │
│  PROFILE INFORMATION                                    │
│  ├─ profilePhoto: String (URL)                          │
│  ├─ bio: String (max 500 chars)                         │
│  └─ phone: String                                       │
│                                                          │
│  SUBSCRIPTION & ROLE                                    │
│  ├─ role: String (user|premium|admin)                   │
│  ├─ subscriptionTier: String (free|pro|enterprise)      │
│  ├─ subscriptionStartDate: Date                         │
│  └─ subscriptionEndDate: Date                           │
│                                                          │
│  ACCOUNT STATUS                                         │
│  ├─ isVerified: Boolean                                 │
│  ├─ isActive: Boolean                                   │
│  ├─ lastLogin: Date                                     │
│  └─ verificationToken: String                           │
│                                                          │
│  SECURITY                                               │
│  ├─ failedLoginAttempts: Number                         │
│  ├─ lockoutUntil: Date                                  │
│  └─ firebaseUID: String (optional)                      │
│                                                          │
│  PREFERENCES                                            │
│  ├─ language: String                                    │
│  ├─ timezone: String                                    │
│  └─ notifications: Boolean                              │
│                                                          │
│  METADATA                                               │
│  ├─ createdAt: Date (auto)                              │
│  └─ updatedAt: Date (auto)                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Request Processing Pipeline

```
HTTP Request arrives
        │
        ▼
┌─────────────────────────┐
│ CORS Middleware         │
│ - Check origin          │
│ - Allow/Deny request    │
└────────────┬────────────┘
             │ Allowed
             ▼
┌─────────────────────────┐
│ Body Parser Middleware  │
│ - Parse JSON            │
│ - Parse URL encoded     │
│ - Attach to req.body    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Helmet Middleware       │
│ - Add security headers  │
│ - Prevent XSS, etc      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Route Matching          │
│ - Check method (GET,...)│
│ - Check path            │
│ - Find matching route   │
└────────────┬────────────┘
             │ Match found
             ▼
┌─────────────────────────┐
│ Route Middleware        │
│ - For protected routes: │
│ - authenticateToken     │
│ - Check JWT             │
│ - Attach req.user       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Controller Function     │
│ - Business logic        │
│ - Database queries      │
│ - Prepare response      │
└────────────┬────────────┘
             │
        ┌────┴────┐
        │          │
     Success     Error
        │          │
        ▼          ▼
   ┌─────────┐  ┌──────────────┐
   │Send JSON│  │Error Handler │
   │Response │  │Catch & format│
   │200 OK   │  │Send error    │
   └─────────┘  │response      │
                └──────────────┘
```

---

## 🔐 Password Security Flow

```
User Input: "MyPassword123"
        │
        ▼
┌─────────────────────────────────┐
│ Pre-Save Hook (before DB save)  │
│ userSchema.pre('save', ...)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ bcryptjs.hash()                 │
│ - Salt rounds: 10               │
│ - Random salt generated         │
│ - Password hashed               │
│                                 │
│ Plain: "MyPassword123"          │
│ Hashed: "$2a$10$N9qo8uL..."    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Store in MongoDB                │
│ password: "$2a$10$N9qo8uL..."  │
│ (NEVER store plain text!)       │
└────────────┬────────────────────┘
             │
             ▼
        LOGIN PROCESS:
        User enters: "MyPassword123"
             │
             ▼
┌─────────────────────────────────┐
│ bcryptjs.compare()              │
│ - Get stored hash from DB       │
│ - Compare plain with hash       │
│ - Returns true/false            │
└────────────┬────────────────────┘
             │
        ┌────┴────┐
        │          │
      TRUE       FALSE
        │          │
   Password   Password
   Correct    Incorrect
```

---

## 📡 API Response Format

```
Success Response:
┌─────────────────────────────────────────┐
│ HTTP 200 OK                             │
│                                         │
│ {                                       │
│   "success": true,                      │
│   "message": "Operation successful",    │
│   "data": {                             │
│     "user": {...},                      │
│     "token": "eyJ..."                   │
│   }                                     │
│ }                                       │
└─────────────────────────────────────────┘

Error Response:
┌─────────────────────────────────────────┐
│ HTTP 400/401/403/404/500                │
│                                         │
│ {                                       │
│   "success": false,                     │
│   "message": "Error description",       │
│   "code": "ERROR_CODE",                 │
│   "status": 400                         │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## 🎯 Middleware Chain

```
Incoming Request
        │
        ▼
┌─────────────────────────────────┐
│ app.use(helmet())               │  1. Security
│ app.use(cors())                 │  2. CORS
│ app.use(express.json())         │  3. Parse JSON
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ app.use('/api/auth', authRoutes)│
│                                 │
│ For protected routes:           │
│ └─ authenticateToken            │
│    └─ Controller logic          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ app.use(notFoundHandler)        │  4. 404 Handler
│ app.use(errorHandler)           │  5. Error Handler
└─────────────────────────────────┘
```

---

## 🔀 Error Handling Flow

```
Error Occurs
    │
    ├─ Sync Error
    │  └─ Caught by try-catch
    │
    └─ Async Error
       └─ Caught by asyncHandler
          └─ Passed to next(error)
             │
             ▼
        Global errorHandler
             │
        ┌────┴────┐
        │          │
    Development  Production
        │          │
        ▼          ▼
    Include    Exclude
    stack      stack
    trace      trace
        │          │
        └────┬─────┘
             ▼
        Send JSON Error Response
        {
          success: false,
          message: "User-friendly message",
          status: 400
        }
```

---

## 🗄️ Folder Structure Decision Tree

```
Which file to create?

Need to store data?
├─ YES → models/YourEntity.js
└─ NO  → Continue below

Need to handle HTTP requests?
├─ YES → routes/yourRoute.js
└─ NO  → Continue below

Need to implement business logic?
├─ YES → controllers/yourController.js
└─ NO  → Continue below

Need to connect to external service?
├─ YES → config/serviceConfig.js
└─ NO  → Continue below

Need to run on every request?
├─ YES → middleware/yourMiddleware.js
└─ NO  → Continue below

Helper function?
└─ YES → utils/helpers.js
```

---

## 🚀 Deployment Architecture

```
Development:
┌────────────────────────────────────┐
│ Localhost                          │
│ ┌──────────────┐                   │
│ │ Express App  │                   │
│ │ :5000        │                   │
│ └──────────────┘                   │
│         │                          │
│   ┌─────▼──────┐                   │
│   │ MongoDB    │                   │
│   │ localhost  │                   │
│   └────────────┘                   │
└────────────────────────────────────┘

Production:
┌────────────────────────────────────────┐
│ Hosting Platform (Heroku, AWS, etc)    │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Express Server (Scaled)          │   │
│ │ - Multiple instances             │   │
│ │ - Load balancer                  │   │
│ ├──────────────────────────────────┤   │
│ │ Environment Variables (Secrets)  │   │
│ │ - MongoDB Atlas URI              │   │
│ │ - JWT Secret                     │   │
│ └──────────────────────────────────┘   │
│         │                              │
│         ▼                              │
│ ┌──────────────────────────────────┐   │
│ │ MongoDB Atlas (Cloud)            │   │
│ │ - Auto-scaling                   │   │
│ │ - Backup & recovery              │   │
│ │ - IP Whitelist                   │   │
│ └──────────────────────────────────┘   │
│         │                              │
│         ▼                              │
│ ┌──────────────────────────────────┐   │
│ │ Monitoring & Logging             │   │
│ │ - Error tracking (Sentry)        │   │
│ │ - Performance monitoring         │   │
│ │ - Uptime monitoring              │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## ✨ Architecture Summary

✅ **Layered Architecture** - Separation of concerns
✅ **Middleware Pattern** - Reusable cross-cutting concerns
✅ **MVC Pattern** - Models, Controllers, Views
✅ **Error Handling** - Centralized error management
✅ **Security** - Multiple layers of protection
✅ **Scalability** - Stateless, horizontal scaling ready
✅ **Database Optimization** - Indexes and lean queries
✅ **JWT Authentication** - Stateless token-based auth

**Your backend is architected for success! 🚀**
