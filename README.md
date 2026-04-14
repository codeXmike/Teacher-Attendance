# Teacher Attendance Platform

Multi-tenant QR attendance system for lecturers and students with real-time updates, location verification, and multi-platform support.

## ✨ Key Features

- 📱 **QR Code Scanning** - Dynamic QR codes with automatic token rotation
- 🗺️ **Location Verification** - Geolocation-based attendance validation
- 📊 **Real-time Dashboard** - Live attendance monitoring with Socket.io
- 👥 **Multi-platform** - Web, Desktop (Electron), and Mobile (React Native)
- 🔐 **Secure Authentication** - JWT-based multi-tenant isolation
- ⚡ **Optimized Performance** - No countdown polling, event-driven updates

## 🏗️ Apps

- `apps/api` - Express + MongoDB backend with Socket.io
- `apps/web` - React web client for both lecturer and student
- `apps/electron` - Electron desktop app (uses web build)
- `apps/student-mobile` - React Native Expo app for students

## 🚀 Quick Start

### Development

```bash
# Install all dependencies
npm install

# Setup environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Terminal 1: MongoDB
mongod

# Terminal 2: API Server
cd apps/api && npm run dev

# Terminal 3: Web App
cd apps/web && npm run dev
```

Visit `http://localhost:5173`

### Electron App
```bash
cd apps/electron && npm run dev
```

### Mobile App
```bash
cd apps/student-mobile && npm start
# For Android emulator: set EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

## 📋 Production Deployment

See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for comprehensive deployment instructions including:
- Environment configuration
- API server deployment
- Web app hosting
- Electron builds
- Mobile builds
- Security setup
- Troubleshooting

## 🔒 Security Features

- JWT authentication for lecturers and students
- Multi-tenant scoping through `lecturer_id`
- Short-lived QR tokens stored as hashes
- One attendance per student per session
- Haversine geo-validation
- Socket.IO real-time updates with auth
- CORS properly configured
- Input validation on all endpoints
- Error boundary in React app

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│          Frontend Apps                    │
├──────────┬──────────┬────────────────────┤
│   Web    │ Electron │   Mobile (RN)      │
└──────────┴──────────┴─────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │  API Server  │
                    │  (Node/Exp)  │
                    └──────┬───────┘
                           │
                    ┌──────▼──────┐
                    │  MongoDB     │
                    └──────────────┘
```

## 🔄 Attendance Flow

### Lecturer
1. Login with email/password
2. Create/select course
3. Start session (generates QR)
4. Share QR with students
5. Monitor live attendance

### Student  
1. Login with email/password
2. Scan QR code from link/QRPanel
3. Allow location access
4. Confirm attendance
5. See success confirmation

## 🎯 Recent Improvements (Production Ready)

✅ **Removed Timer** - No countdown polling, reduced API calls  
✅ **Fixed Token Auth** - Students can scan without prior login attempt  
✅ **Separate Electron Build** - Loads from file instead of localhost  
✅ **Unified UIs** - Electron uses same web build; mobile shares auth logic  
✅ **Input Validation** - Location, email, matric number validation  
✅ **Error Boundaries** - Global error handling in React app  
✅ **Env Configuration** - Production-ready environment setup  

## 📁 Project Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, error handling
│   │   ├── services/        # JWT token service
│   │   ├── utils/           # Validation, crypto, errors
│   │   ├── config/          # Environment config
│   │   ├── app.js          # Express setup
│   │   └── server.js       # HTTP + Socket.io server
│   └── package.json
├── web/
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   ├── components/     # React components
│   │   ├── context/        # Auth context
│   │   ├── hooks/          # Custom hooks
│   │   ├── api/            # API client
│   │   ├── styles/         # CSS
│   │   ├── App.jsx         # Main app with error boundary
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── electron/
│   ├── main.js            # Electron main process
│   ├── dist/              # Built web app (copied here)
│   └── package.json
└── student-mobile/
    ├── App.js             # React Native entry
    ├── app.json           # Expo config
    └── package.json
```

## 🔌 API Endpoints

### Auth
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Sessions
- `POST /session/start` - Start attendance session
- `POST /session/:id/rotate` - Rotate QR token
- `POST /session/:id/stop` - End session
- `GET /session` - List sessions

### Attendance
- `POST /attendance/scan` - Record attendance via QR
- `GET /attendance/session/:id` - Get session attendance
- `DELETE /attendance/:id` - Remove record
- `POST /attendance/manual` - Add manually

### Courses
- `GET /course/lecturer` - List lecturer's courses
- `POST /course` - Create course

## 🛠️ Development

### Running Locally
- API: `http://localhost:4000`
- Web: `http://localhost:5173`
- Electron: Uses web build or localhost
- Mobile: Uses EXPO_PUBLIC_API_URL

### Database
```bash
# Start MongoDB
mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### Environment Variables
See `.env.example` files in each app directory. Key ones:
- `JWT_SECRET` - Must be changed in production!
- `VITE_API_URL` - Frontend API endpoint
- `MONGODB_URI` - Database connection
- `SESSION_TOKEN_TTL_SECONDS` - QR expiration time

## 📦 Build & Deploy

### Web
```bash
cd apps/web
npm run build  # Creates dist/
```

### Electron
```bash
cd apps/electron
npm run build  # Builds Windows installer
npm run build:win
```

### Mobile
```bash
cd apps/student-mobile
eas build --platform android  # or ios
```

## 🐛 Troubleshooting

**"Session token is invalid"**
- Verify time sync between server/client
- Check if session is still active
- QR codes expire after 90 seconds

**"Student workspace not found"**
- Ensure student is registered with lecturer's email
- Verify student belongs to lecturer's workspace

**"Location permission required"**
- Enable geolocation in browser
- HTTPS required (except localhost)
- Check device location services

## 📚 Additional Resources

- **Production Guide**: [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)
- **API Config**: `apps/api/.env.example`
- **Web Config**: `apps/web/.env.example`

## 🎓 Security Checklist for Production

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Configure DNS with proper domain
- [ ] Set `CLIENT_URLS` to specific domains
- [ ] Use environment variables for all secrets
- [ ] Enable database authentication
- [ ] Setup monitoring/logging (Sentry, LogRocket, etc.)
- [ ] Regular backups of MongoDB
- [ ] Rate limiting on API endpoints

## 📞 Support

For deployment help, see PRODUCTION_GUIDE.md  
For technical issues, check individual app README files  
For questions, refer to the architecture documentation above
