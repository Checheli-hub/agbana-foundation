# NGO Backend API

A Node.js/Express backend for the NGO Beneficiary Management System with MongoDB integration.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (running locally on `mongodb://localhost:27017`)
- **npm** (comes with Node.js)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already configured:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ngo-beneficiary-system
NODE_ENV=development
```

### 3. Ensure MongoDB is Running

Make sure MongoDB is running on your system:

```bash
# On Windows
mongod

# Or check if it's already running as a service
```

### 4. Start the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server will run on **http://localhost:5000**

## 📊 Database

- **Database Name:** `ngo-beneficiary-system`
- **Collections:**
  - `users` - Staff user accounts (Admin/User roles)
  - `beneficiaries` - Beneficiary records

Data is persisted in MongoDB automatically.

## 🔌 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint               | Purpose                     |
| ------ | ---------------------- | --------------------------- |
| POST   | `/auth/login`          | Sign in user                |
| POST   | `/auth/register`       | Register new user           |
| POST   | `/auth/admin`          | Create new admin account    |
| POST   | `/auth/reset-password` | Reset user password         |
| POST   | `/auth/promote`        | Promote user to admin       |
| POST   | `/auth/demote`         | Demote admin to user        |
| POST   | `/auth/update`         | Update user account details |
| POST   | `/auth/logout`         | Sign out                    |

### Beneficiaries (`/beneficiaries`)

| Method | Endpoint             | Purpose                |
| ------ | -------------------- | ---------------------- |
| GET    | `/beneficiaries`     | Get all beneficiaries  |
| GET    | `/beneficiaries/:id` | Get single beneficiary |
| POST   | `/beneficiaries`     | Create new beneficiary |
| PUT    | `/beneficiaries/:id` | Update beneficiary     |
| DELETE | `/beneficiaries/:id` | Delete beneficiary     |

### System

| Method | Endpoint  | Purpose      |
| ------ | --------- | ------------ |
| GET    | `/health` | Health check |

## 🧪 Testing with Postman

### Import Collection

1. Open **Postman**
2. Click **Import** → **Upload Files**
3. Select `NGO_Backend_Collection.postman_collection.json`
4. Collection will be loaded with all endpoints

### Or Test Manually

**Register a user:**

```bash
POST http://localhost:5000/auth/register
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "testpass123"
}
```

**Login:**

```bash
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "testpass123",
  "role": "User"
}
```

**Create beneficiary:**

```bash
POST http://localhost:5000/beneficiaries
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "gender": "Female",
  "phone": "08087654321",
  "email": "jane@example.com",
  "status": "New",
  "notes": "Referred by community leader"
}
```

## 🔗 Frontend Integration

The frontend connects to this backend via the `.env` file:

**Frontend .env:**

```
VITE_API_BASE_URL=http://localhost:5000
```

The frontend's `authService.js` automatically:

- ✅ Detects backend is running (via `VITE_API_BASE_URL`)
- ✅ Proxies all auth calls to backend endpoints
- ✅ Returns backend response directly

## 📁 Project Structure

```
ngo-backend/
├── server.js              # Express server setup
├── package.json           # Dependencies
├── .env                   # Environment config
├── .gitignore             # Git ignore rules
├── models/
│   ├── User.js           # User schema (Admin/User)
│   └── Beneficiary.js    # Beneficiary schema
├── routes/
│   ├── auth.js           # Auth endpoints
│   └── beneficiaries.js  # Beneficiary endpoints
├── POSTMAN_GUIDE.md      # Postman testing guide
├── NGO_Backend_Collection.postman_collection.json  # Postman collection
└── README.md             # This file
```

## 🔐 Authentication Flow

1. User registers or logs in via frontend
2. Frontend calls backend auth endpoint
3. Backend validates credentials against MongoDB
4. Backend returns user info and all staff users
5. Frontend stores session in localStorage
6. Subsequent requests use localStorage session

## 📝 API Response Format

**Success Response:**

```json
{
  "username": "john",
  "email": "john@example.com",
  "role": "User",
  "users": [...]
}
```

**Error Response:**

```json
{
  "error": "Error message here"
}
```

## 🐛 Troubleshooting

### MongoDB Connection Error

```
✗ MongoDB connection error: connect ECONNREFUSED
```

**Solution:** Make sure MongoDB is running. Start it with `mongod`

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:** Change `PORT` in `.env` or kill the process using port 5000

### Dependencies Not Installed

```
Cannot find module 'express'
```

**Solution:** Run `npm install`

## 📦 Deployment

To deploy this backend:

1. **Install dependencies:** `npm install`
2. **Set MongoDB URI:** Update `MONGODB_URI` in `.env` to your cloud MongoDB (e.g., MongoDB Atlas)
3. **Set environment:** `NODE_ENV=production` in `.env`
4. **Deploy to Heroku/AWS/Render:** Follow your platform's Node.js deployment guide

## 📞 Support

For API documentation, see `POSTMAN_GUIDE.md`

For frontend integration issues, check the frontend's `src/services/authService.js`
