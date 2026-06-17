# NGO Backend API - Postman Testing Guide

## Base URL

`http://localhost:5000`

---

## Auth Endpoints

### 1. Login

**POST** `/auth/login`

Body (JSON):

```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "testadmin123",
  "role": "Admin"
}
```

---

### 2. Register User

**POST** `/auth/register`

Body (JSON):

```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "testuser123"
}
```

---

### 3. Create Admin

**POST** `/auth/admin`

Body (JSON):

```json
{
  "username": "superadmin",
  "email": "superadmin@example.com",
  "password": "adminpass123"
}
```

---

### 4. Reset Password

**POST** `/auth/reset-password`

Body (JSON):

```json
{
  "username": "john",
  "email": "john@example.com",
  "role": "User",
  "newPassword": "newpass123"
}
```

For Admin (no username needed):

```json
{
  "email": "admin@example.com",
  "role": "Admin",
  "newPassword": "newadminpass123"
}
```

---

### 5. Promote User to Admin

**POST** `/auth/promote`

Body (JSON):

```json
{
  "username": "john"
}
```

---

### 6. Demote Admin to User

**POST** `/auth/demote`

Body (JSON):

```json
{
  "username": "superadmin"
}
```

---

### 7. Update User Account

**POST** `/auth/update`

Body (JSON):

```json
{
  "username": "john",
  "updates": {
    "email": "john.new@example.com",
    "password": "anotherpass123"
  }
}
```

---

### 8. Logout

**POST** `/auth/logout`

No body needed.

---

## Beneficiary Endpoints

### 1. Get All Beneficiaries

**GET** `/beneficiaries`

---

### 2. Get Single Beneficiary

**GET** `/beneficiaries/{id}`

Replace `{id}` with actual MongoDB ObjectId

---

### 3. Create Beneficiary

**POST** `/beneficiaries`

Body (JSON):

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "phone": "08012345678",
  "email": "john.doe@example.com",
  "status": "New",
  "notes": "New community member"
}
```

---

### 4. Update Beneficiary

**PUT** `/beneficiaries/{id}`

Body (JSON):

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "phone": "08012345678",
  "email": "john.doe@example.com",
  "status": "Called",
  "notes": "Follow-up call completed"
}
```

---

### 5. Delete Beneficiary

**DELETE** `/beneficiaries/{id}`

---

## Health Check

**GET** `/health`

Should return: `{ "status": "OK", "message": "NGO Backend is running." }`
