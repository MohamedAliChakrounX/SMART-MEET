# 🔧 Exact Commands to Run the Application

Copy-paste these commands in order.

---

## Step 1: Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd E:\sfm-PFE\Meeting-IA-sfm\Backend

# Install PHP dependencies
composer install

# Create database
php bin/console doctrine:database:create

# Run migrations
php bin/console doctrine:migrations:migrate

# Generate JWT keys
php bin/console lexik:jwt:generate-keypair

# Create test user
php bin/console app:create-test-user
```

**Expected output for test user:**
```
✓ Test user created successfully!
  Email: test@example.com
  Password: password123
```

---

## Step 2: Start Backend Server (Terminal 1)

```bash
# Still in Backend directory
php -S localhost:8000 -t public
```

**Expected output:**
```
[Wed Apr 01 17:50:00 2026] PHP 8.2.0 Development Server started at http://localhost:8000
[Wed Apr 01 17:50:00 2026] Listening on http://localhost:8000
```

✅ **Backend ready at: http://localhost:8000**

---

## Step 3: Frontend Setup (Terminal 2)

```bash
# Navigate to frontend
cd E:\sfm-PFE\Meeting-IA-sfm\Frontend-Web

# Install JavaScript dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v7.3.1  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  Press h + enter to show help
```

✅ **Frontend ready at: http://localhost:5173**

---

## Step 4: Test the Application

### In a new terminal (Terminal 3):

```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

---

## Step 5: Access the Application

### Frontend
Open your browser to: **http://localhost:5173**

You'll see a login page. Enter:
- **Email**: `test@example.com`
- **Password**: `password123`

Click **Login** and you're in!

---

## 📋 Terminal Layout

```
┌─────────────────────────────────────────┐
│ Terminal 1: Backend Server (PHP)        │
│ $ php -S localhost:8000 -t public       │
│ Listening on http://localhost:8000      │
├─────────────────────────────────────────┤
│ Terminal 2: Frontend Server (Node)      │
│ $ npm run dev                           │
│ Local:   http://localhost:5173/         │
├─────────────────────────────────────────┤
│ Terminal 3: Testing (curl/commands)     │
│ $ curl http://localhost:8000/api/v1/... │
└─────────────────────────────────────────┘
```

---

## 🔑 Login Credentials

```
Email:    test@example.com
Password: password123
```

---

## 🧪 Additional Test Commands

### Get current user info
```bash
TOKEN="<your-token-from-login>"

curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### List meetings
```bash
curl -X GET http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Create a meeting
```bash
curl -X POST http://localhost:8000/api/v1/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Meeting",
    "startAt": "2026-04-01T14:00:00Z",
    "durationMinutes": 60,
    "status": "In_Progress",
    "participants": ["Alice", "Bob", "Charlie"]
  }'
```

---

## 🛑 Stopping the Servers

### To stop backend (Terminal 1)
```
Press Ctrl+C
```

### To stop frontend (Terminal 2)
```
Press Ctrl+C
```

---

## 🆘 Troubleshooting

### Port 8000 already in use
```bash
# Use different port
php -S localhost:8001 -t public
```

### Port 5173 already in use
```bash
# Frontend will automatically use next available port
# Or specify one manually in .env
```

### Database error
```bash
# Verify PostgreSQL is running
# On Windows with Docker:
docker-compose up -d

# Then retry database commands
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### Test user already exists
```bash
# Just login with existing credentials
Email: test@example.com
Password: password123
```

### 401 Unauthorized on login
```bash
# Recreate test user
php bin/console app:create-test-user --force

# Or verify user exists
php bin/console doctrine:query:sql "SELECT * FROM \"user\""
```

---

## ✅ Success Checklist

- [ ] Composer installed (`composer --version`)
- [ ] Node.js installed (`node --version`)
- [ ] PostgreSQL running (check localhost:5432)
- [ ] Backend: `php bin/console doctrine:database:create` succeeded
- [ ] Backend: migrations ran successfully
- [ ] Backend: test user created
- [ ] Backend server running at localhost:8000
- [ ] Frontend server running at localhost:5173
- [ ] Can login with test@example.com / password123
- [ ] Can see meetings list
- [ ] Can create new meeting

---

## 🎉 All Set!

Your application is ready to use. Start with the frontend at http://localhost:5173

Happy coding! 🚀
