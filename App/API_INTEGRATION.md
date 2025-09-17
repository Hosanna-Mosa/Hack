# API Integration Documentation

## Overview

This document describes the API integration between the React Native App and the Backend server for the School Attendance Management System.

## Backend Connection

- **Base URL**: `http://localhost:5000/api` (development)
- **Production URL**: `https://your-production-api.com/api` (to be configured)

## API Structure

### Authentication API (`/api/auth`)

- **POST** `/login` - User login
- **POST** `/register` - User registration
- **GET** `/me` - Get current user (requires authentication)

### Attendance API (`/api/attendance`)

- **GET** `/attendance` - Get attendance records
- **POST** `/attendance` - Mark attendance
- **PUT** `/attendance/:id` - Update attendance record

### Students API (`/api/students`)

- **GET** `/students` - Get students list
- **GET** `/students/:id` - Get student by ID

### Classes API (`/api/classes`)

- **GET** `/classes` - Get classes list
- **GET** `/classes/:id` - Get class by ID

### Health API (`/api/health`)

- **GET** `/health` - Health check endpoint

## App Structure

### Files Created/Modified

1. **`lib/api.ts`** - Main API configuration and services
2. **`types/index.ts`** - TypeScript type definitions
3. **`contexts/AuthContext.tsx`** - Authentication state management
4. **`components/AuthGuard.tsx`** - Authentication guard component
5. **`app/login.tsx`** - Updated login screen with API integration
6. **`app/dashboard.tsx`** - Updated dashboard with auth integration
7. **`app/_layout.tsx`** - Added AuthProvider wrapper
8. **`app/index.tsx`** - Updated landing page with AuthGuard

### Key Features

- **Token Management**: Automatic token storage and retrieval using AsyncStorage
- **Authentication Context**: Global auth state management with React Context
- **Error Handling**: Comprehensive error handling for API calls
- **Type Safety**: Full TypeScript support with proper type definitions
- **Auto-navigation**: Automatic navigation based on authentication state

## Usage

### Login Flow

1. User enters phone number and password
2. Phone number is converted to email format (`{phone}@school.local`)
3. API call to `/api/auth/login`
4. On success: token stored, user redirected to dashboard
5. On failure: error message displayed

### Authentication Guard

- Automatically checks authentication status on app start
- Redirects unauthenticated users to login
- Redirects authenticated users to appropriate dashboard based on role

### Logout Flow

1. User clicks logout button
2. Token removed from storage
3. User redirected to landing page

## Testing

### Backend Connection Test

Run the test script to verify backend connectivity:

```bash
node test-api.js
```

### Manual Testing

1. Start the backend server: `cd Backend && npm run dev`
2. Start the React Native app: `cd App && npm start`
3. Test login with valid credentials
4. Verify dashboard loads with user information
5. Test logout functionality

## Configuration

### Environment Variables

The API base URL is configured in `lib/api.ts`:

```typescript
const API_BASE_URL = __DEV__
  ? "http://localhost:5000/api"
  : "https://your-production-api.com/api";
```

### CORS Configuration

The backend is configured to accept requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:8081` (Expo dev server)
- `http://localhost:8080` (Alternative port)
- `http://localhost:3000` (React dev server)

## Error Handling

### API Errors

- Network errors are caught and displayed to user
- Authentication errors redirect to login
- Validation errors show specific error messages

### Token Management

- Tokens are automatically included in API requests
- Expired tokens trigger automatic logout
- Token storage is secure using AsyncStorage

## Security Considerations

1. **Token Storage**: Tokens stored securely in AsyncStorage
2. **HTTPS**: Production should use HTTPS endpoints
3. **Input Validation**: All inputs validated on both client and server
4. **Error Messages**: Generic error messages to prevent information leakage

## Next Steps

1. **Production Configuration**: Update API URLs for production
2. **Error Monitoring**: Add error tracking (Sentry, etc.)
3. **Offline Support**: Implement offline data caching
4. **Push Notifications**: Add notification support
5. **Biometric Auth**: Add fingerprint/face ID support


