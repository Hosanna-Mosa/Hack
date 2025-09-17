# Troubleshooting Guide

## Common Issues and Solutions

### 1. JSON Parse Error

**Error**: `API request failed: [SyntaxError: JSON Parse error: Unexpected end of input]`

**Cause**: Backend server is not running or returning empty responses

**Solution**:

1. Start the backend server:

   ```bash
   cd Backend
   npm run dev
   ```

   Or use the provided script:

   ```bash
   ./start-backend.sh
   ```

2. Verify the server is running on port 5000:
   ```bash
   curl http://localhost:5000/api/health
   ```

### 2. Network Connection Error

**Error**: `Network error: Unable to connect to server`

**Solution**:

- Check if backend server is running
- Verify the API_BASE_URL in `lib/api.ts` is correct
- For mobile devices, use your computer's IP address instead of localhost

### 3. Navigation Error

**Error**: `Attempted to navigate before mounting the Root Layout component`

**Solution**: This has been fixed with the AuthWrapper component. If you still see this error:

- Restart the app
- Clear the app cache
- Check that AuthWrapper is properly wrapping the app in `_layout.tsx`

### 4. Authentication Issues

**Problem**: Login not working or user not staying logged in

**Solutions**:

- Check if backend auth endpoints are working
- Verify JWT_SECRET is set in backend .env file
- Check AsyncStorage permissions
- Clear app data and try again

### 5. Backend Server Won't Start

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:

```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5001 npm run dev
```

### 6. Database Connection Issues

**Error**: `MongoDB connection failed`

**Solution**:

1. Install and start MongoDB:

   ```bash
   # macOS with Homebrew
   brew install mongodb-community
   brew services start mongodb-community

   # Or use MongoDB Atlas (cloud)
   ```

2. Update MONGODB_URI in Backend/.env file

## Debugging Tools

### Backend Status Component

The login screen now shows a backend connection status indicator:

- 🟢 Green: Connected
- 🟡 Yellow: Checking
- 🔴 Red: Connection failed

### API Testing

Test the backend manually:

```bash
# Health check
curl http://localhost:5000/api/health

# Test login (will fail with invalid credentials)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"wrong"}'
```

### Console Logs

Check the console for detailed error messages:

- App logs: React Native debugger or Expo logs
- Backend logs: Terminal where server is running

## Environment Setup

### Backend Requirements

- Node.js 16+
- MongoDB (local or Atlas)
- npm or yarn

### App Requirements

- Node.js 16+
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Environment Variables

Create `Backend/.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/school-attendance
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081,http://localhost:5173
```

## Quick Start Commands

```bash
# Start backend
cd Backend && npm run dev

# Start app (in another terminal)
cd App && npm start

# Test backend connection
curl http://localhost:5000/api/health
```

## Getting Help

1. Check the console logs for specific error messages
2. Verify all services are running (backend, database)
3. Test API endpoints manually with curl
4. Check network connectivity
5. Restart all services if needed

