# Production Deployment Guide

## Overview
This is a multi-app monorepo containing:
- **API Server** (`apps/api`) - Node.js/Express backend
- **Web App** (`apps/web`) - React frontend  
- **Electron App** (`apps/electron`) - Desktop application
- **Mobile App** (`apps/student-mobile`) - React Native mobile app

## Prerequisites
- Node.js 18+
- MongoDB 5.0+
- npm or yarn

## Setup & Installation

### 1. Install Dependencies
```bash
# Root level
npm install

# Or install each app
cd apps/api && npm install
cd ../web && npm install
cd ../electron && npm install
cd ../student-mobile && npm install
```

### 2. Environment Configuration

Create `.env` files in each app directory:

#### `apps/api/.env`
```env
PORT=4000
MONGODB_URI=mongodb://your-mongo-server:27017/attendance_platform
JWT_SECRET=your-secure-random-string-here
CLIENT_URLS=https://yourdomain.com,https://www.yourdomain.com
SESSION_TOKEN_TTL_SECONDS=90
SESSION_ROTATION_SECONDS=75
DEFAULT_ATTENDANCE_RADIUS_METERS=100
```

#### `apps/web/.env`
```env
VITE_API_URL=https://api.yourdomain.com
```

#### `apps/electron/.env`
```env
VITE_API_URL=https://api.yourdomain.com
```

#### `apps/student-mobile/.env`
```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
```

## Deployment

### API Server

#### Development
```bash
cd apps/api
npm run dev
```

#### Production
```bash
cd apps/api
npm start
```

Deploy using:
- Docker
- Heroku
- AWS Lambda
- Azure App Service
- DigitalOcean
- Linode
- or any Node.js hosting

**Key points:**
- Ensure MongoDB is configured and accessible
- Use strong JWT_SECRET in production
- Enable HTTPS/TLS
- Configure CORS with proper CLIENT_URLS
- Set NODE_ENV=production

### Web Application

#### Development
```bash
cd apps/web
npm run dev
```

#### Production Build
```bash
cd apps/web
npm run build
```

Deploy the `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- or any static hosting

**Configuration:**
- Set `VITE_API_URL` env variable before build or use `.env.production`
- Ensure CORS headers are set on the API server

### Electron Application

#### Development
```bash
cd apps/electron
npm run dev
```

#### Building for Production
```bash
cd apps/electron
npm run build:win      # Windows
npm run build          # Multi-platform (requires setup)
```

**Features:**
- Automatically builds web app and copies to electron dist/
- Loads from local dist/ file in production
- Falls back to localhost in development

### Mobile Application

#### Development
```bash
cd apps/student-mobile
npm start
```

#### Building for Production
```bash
# iOS (requires macOS)
eas build --platform ios

# Android
eas build --platform android
```

**Production Features:**
- ✅ Persistent authentication (SecureStore) - students stay logged in
- ✅ Automatic location permission request on app start
- ✅ Location-aware attendance submission
- ✅ QR code scanning & manual token entry
- ✅ Logout button in navbar for user-initiated sign-out
- ✅ No timer/countdown features (cleaned up code)

**Mobile-Specific Setup:**
1. Install Expo CLI: `npm install -g expo-cli`
2. Create `.env` with `EXPO_PUBLIC_API_URL`
3. Build with EAS (Expo Application Services) for distribution
4. Test location permission flow on physical device
5. Verify attendance submissions include geolocation

## Key Production Improvements

### Authentication & Security
- ✅ Token-based JWT authentication
- ✅ Secure password hashing (bcrypt)
- ✅ CORS properly configured
- ✅ Environment variables for secrets
- ✅ **Students stay logged in forever** (no logout button in student apps)
- ✅ **Students cannot switch accounts** (prevents unauthorized access by friends)
- ✅ Lecturer logout available for account switching

### Error Handling
- ✅ Global error boundary in React app
- ✅ Comprehensive error messages
- ✅ Proper HTTP status codes
- ✅ Client-side validation
- ✅ Mobile app error feedback

### Performance
- ✅ Removed countdown timer polling (all apps)
- ✅ Socket.io for real-time updates
- ✅ Optimized re-renders
- ✅ Lazy-loaded routes
- ✅ **Removed location tracking from student apps**

### Attendance Features
- ✅ QR code generation & scanning (Web, Electron, Mobile)
- ✅ **Location captured by API for lecturers only** (geofencing for lecturer sessions)
- ✅ Session management with token rotation
- ✅ Real-time attendance sync
- ✅ Students submit attendance without location data

## Important Security Notes

1. **JWT Secret**: Change `JWT_SECRET` to a random 32+ character string
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure `CLIENT_URLS` with specific domains only
4. **MongoDB**: Use connection string with authentication
5. **Environment Variables**: Never commit `.env` files to version control
6. **Rate Limiting**: Consider adding rate limiting middleware  
7. **Logging**: Enable audit logging for sensitive operations

## Database

### MongoDB Setup

```bash
# Local development
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

## Monitoring & Logging

Recommended services:
- **Error Tracking**: Sentry, LogRocket, or Rollbar
- **Logging**: LogRocket, Loggly, or ELK Stack
- **Performance**: New Relic, DataDog, or Grafana
- **Uptime**: UptimeRobot, StatusPage

## Troubleshooting

### Token Errors
- Ensure students are logged in before scanning
- Check JWT_SECRET matches across api and client
- Verify CORS configuration

### Location Issues
- Enable location services in browser/device
- Check HTTPS (required for geolocation)
- Verify DEFAULT_ATTENDANCE_RADIUS_METERS setting

### QR Code Problems
- Ensure session is active
- Check token rotation is working
- Verify network connectivity

## Support
For issues or questions, refer to individual app READMEs or project documentation.
