const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const hostRouter = require('./Controller/HostController');
const driverRouter = require('./Controller/DriverController');
const studentRouter = require('./Controller/StudentController');

const app = express();
const server = http.createServer(app);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN, methods: ['GET', 'POST'], credentials: true }
});

// Make io accessible to controllers via req.app.get('io')
app.set('io', io);

// Middleware

// CORS configuration (must be before routes)
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'x-host-token']
};
app.use(cors(corsOptions));
// Handle preflight
app.options('*', cors(corsOptions));

// Body parsers (before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static serving for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sessions for driver auth (demo settings)
// NOTE: For production use secure cookies, proper secret management, and a persistent store like connect-mongo
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo_secret_change_me',
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false }
}));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus-tracking';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/host', hostRouter);
app.use('/driver', driverRouter);
app.use('/student', studentRouter);

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bus Tracking Host API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5555;

// Socket.IO minimal auth demo
io.on('connection', (socket) => {
  // Hosts authenticate using token
  socket.on('authenticate', (payload = {}) => {
    const token = payload.token;
    const HOST_TOKEN = process.env.HOST_TOKEN || 'HOST_TOKEN_SANDESH';
    if (token === HOST_TOKEN) {
      socket.join('hosts');
      socket.emit('auth-success', { role: 'host' });
    }
    // Drivers can also send driverId to join their personal room
    if (payload.driverId) {
      socket.join(`driver_${payload.driverId}`);
      socket.emit('auth-success', { role: 'driver', driverId: payload.driverId });
    }
    // Hosts may also provide hostId/areaId for area room subscriptions
    if (payload.hostId) {
      socket.join(`area_${payload.hostId}`);
    }
  });

  // Driver location updates: broadcast to area room
  socket.on('location-update', ({ hostId, driverId, lat, lng }) => {
    if (hostId && typeof lat === 'number' && typeof lng === 'number') {
      io.to(`area_${hostId}`).emit('location-update', { driverId, lat, lng, ts: Date.now() });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});