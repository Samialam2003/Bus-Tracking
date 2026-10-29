const express = require('express');
const router = express.Router();
const Driver = require('../Model/Driver');
const Host = require('../Model/Host');
const bcrypt = require('bcrypt');
const driverAuth = require('../middleware/driverAuth');

// Helper: omit sensitive fields
function sanitizeDriver(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.passwordHash;
  return obj;
}

// POST '/' — Register driver
router.post('/', async (req, res) => {
  try {
    const { name, age, email, password, driverPhoto, vehiclePhoto, experience, apply } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const createPayload = {
      name,
      age,
      email,
      passwordHash,
      driverPhoto: driverPhoto || null,
      vehiclePhoto: vehiclePhoto || null,
      experience: experience || ''
    };
    if (apply) {
      createPayload.status = 'pending';
      createPayload.appliedAt = new Date();
    }
    const driver = await Driver.create(createPayload);

    // Notify hosts if application submitted
    if (apply) {
      const io = req.app.get('io');
      const summary = {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        age: driver.age,
        driverPhoto: driver.driverPhoto,
        vehiclePhoto: driver.vehiclePhoto,
        experience: driver.experience,
        appliedAt: driver.appliedAt
      };
      io && io.to('hosts').emit('new-application', summary);
    }

    return res.status(201).json({ message: 'Driver created', data: sanitizeDriver(driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create driver', details: err.message });
  }
});

// GET '/:id/live-location' — latest live location sample for a driver
router.get('/:id/live-location', async (req, res) => {
  try {
    const { id } = req.params;
    const d = await Driver.findById(id).select('liveLocations');
    if (!d) return res.status(404).json({ error: 'Driver not found' });
    const last = (d.liveLocations || []).slice(-1)[0];
    if (!last) return res.status(200).json({ data: null });
    return res.status(200).json({ data: { lat: last.lat, lng: last.lng, ts: last.ts } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch live location', details: err.message });
  }
});

// GET '/area/:hostId/accepted' — list accepted drivers assigned to given area (for students)
router.get('/area/:hostId/accepted', async (req, res) => {
  try {
    const { hostId } = req.params;
    if (!hostId) return res.status(400).json({ error: 'hostId is required' });
    const drivers = await Driver.find({
        status: 'accepted',
        assignedArea: hostId,
        $or: [ { isAccepted: true }, { isAccepted: { $exists: false } } ]
      })
      .select('-passwordHash')
      .sort({ name: 1 });
    return res.status(200).json({ data: drivers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch drivers for area', details: err.message });
  }
});

// POST '/login' — login with session
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, driver.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    req.session.driverId = driver._id.toString();
    return res.status(200).json({ success: true, driver: sanitizeDriver(driver), message: 'Login successful' });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// POST '/logout' — destroy session
router.post('/logout', async (req, res) => {
  try {
    req.session.destroy(() => {
      res.status(200).json({ success: true, message: 'Logged out' });
    });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed', details: err.message });
  }
});

// GET '/me' — protected
router.get('/me', driverAuth, async (req, res) => {
  try {
    // Populate assignedArea for frontend to know selected area details
    const populated = await Driver.findById(req.driver._id).populate('assignedArea');
    return res.status(200).json({ data: sanitizeDriver(populated) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

router.post('/apply', driverAuth, async (req, res) => {
  try {
    // If already accepted, do not allow reapply (even if not yet assigned)
    if (req.driver.status === 'accepted') {
      return res.status(400).json({ error: 'You are already accepted' });
    }
    req.driver.status = 'pending';
    req.driver.appliedAt = new Date();
    await req.driver.save();
    const io = req.app.get('io');
    const summary = {
      _id: req.driver._id,
      name: req.driver.name,
      age: req.driver.age,
      email: req.driver.email,
      driverPhoto: req.driver.driverPhoto,
      vehiclePhoto: req.driver.vehiclePhoto,
      experience: req.driver.experience,
      appliedAt: req.driver.appliedAt
    };
    io && io.to('hosts').emit('new-application', summary);

    // Exact message as requested by user
    return res.status(200).json({ message: 'Your request has been submitted successfully, we will notify you once host accepts you.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit application', details: err.message });
  }
});
// GET '/' — list drivers by status; host token can see more data
router.get('/', async (req, res) => {
  try {
    const { status } = req.query || {};
    const filter = {};
    if (status) {
      if (status === 'accepted') {
        filter.status = 'accepted';
        filter.$or = [ { isAccepted: true }, { isAccepted: { $exists: false } } ];
      } else if (status === 'pending') {
        filter.status = 'pending';
      } else if (status === 'rejected') {
        filter.status = 'rejected';
      } else if (status === 'active') {
        filter.status = 'active';
      } else {
        filter.status = status;
      }
    }

    const token = req.headers['x-host-token'];
    let q = Driver.find(filter).sort({ createdAt: -1 });
    if (token === 'HOST_TOKEN_SANDESH') {
      q = q.populate('assignedArea');
    }
    let drivers = await q;
    if (token !== 'HOST_TOKEN_SANDESH') {
      // Unauthenticated host: return limited fields only
      drivers = drivers.map(d => ({ _id: d._id, name: d.name, status: d.status, assignedArea: d.assignedArea }));
    } else {
      drivers = drivers.map(d => sanitizeDriver(d));
    }
    return res.status(200).json({ message: 'Drivers fetched', data: drivers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch drivers', details: err.message });
  }
});

// Host-only guard
function requireHostToken(req, res) {
  const token = req.headers['x-host-token'];
  if (token !== 'HOST_TOKEN_SANDESH') {
    res.status(403).json({ error: 'Invalid or missing host token' });
    return false;
  }
  return true;
}

// POST '/:id/accept' — host accepts application
router.post('/:id/accept', async (req, res) => {
  try {
    if (!requireHostToken(req, res)) return;
    const { id } = req.params;
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    driver.status = 'accepted';
    driver.isAccepted = true;
    driver.acceptedAt = new Date();
    await driver.save();

    const io = req.app.get('io');
    io && io.to(`driver_${driver._id}`).emit('application-accepted', { message: 'Your application has been accepted' });

    return res.status(200).json({ message: 'Driver accepted', data: sanitizeDriver(driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to accept driver', details: err.message });
  }
});

// POST '/:id/reject' — host rejects application
router.post('/:id/reject', async (req, res) => {
  try {
    if (!requireHostToken(req, res)) return;
    const { id } = req.params;
    const { reason } = req.body || {};
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    driver.status = 'rejected';
    driver.isAccepted = false;
    driver.rejectedAt = new Date();
    driver.rejectionReason = reason || null;
    await driver.save();

    const io = req.app.get('io');
    io && io.to(`driver_${driver._id}`).emit('application-rejected', { message: reason || 'Your application has been rejected' });

    return res.status(200).json({ message: 'Driver rejected', data: sanitizeDriver(driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reject driver', details: err.message });
  }
});

// POST '/choose-area/:hostId' — driver selects area
router.post('/choose-area/:hostId', driverAuth, async (req, res) => {
  try {
    const { hostId } = req.params;
    if (req.driver.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted drivers can choose an area' });
    }
    const host = await Host.findById(hostId);
    if (!host) return res.status(404).json({ error: 'Area not found' });

    // NOTE: For real atomicity under concurrency, use transactions with mongoose sessions.
    if (host.numberOfDrivers >= 3) {
      return res.status(400).json({ error: 'Maximum drivers reached for this area' });
    }

    req.driver.assignedArea = host._id;
    await req.driver.save();

    host.numberOfDrivers += 1;
    if (Array.isArray(host.drivers)) host.drivers.push(req.driver._id);
    await host.save();

    const io = req.app.get('io');
    io && io.to('hosts').emit('driver-assigned', { driverId: req.driver._id, hostId: host._id });
    io && io.to(`driver_${req.driver._id}`).emit('assigned-success', { hostId: host._id });
    io && io.to(`area_${host._id}`).emit('driver-assigned', { driverId: req.driver._id });

    return res.status(200).json({ message: 'Area chosen', data: sanitizeDriver(req.driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to choose area', details: err.message });
  }
});

// POST '/leave-area' — driver leaves area
router.post('/leave-area', driverAuth, async (req, res) => {
  try {
    const prev = req.driver.assignedArea;
    if (!prev) return res.status(400).json({ error: 'No assigned area to leave' });

    const host = await Host.findById(prev);
    req.driver.assignedArea = null;
    await req.driver.save();

    if (host) {
      host.numberOfDrivers = Math.max(0, (host.numberOfDrivers || 0) - 1);
      if (Array.isArray(host.drivers)) {
        host.drivers = host.drivers.filter(id => id.toString() !== req.driver._id.toString());
      }
      await host.save();
    }

    const io = req.app.get('io');
    io && io.to('hosts').emit('driver-left-area', { driverId: req.driver._id, hostId: prev });
    io && io.to(`area_${prev}`).emit('driver-left-area', { driverId: req.driver._id, hostId: prev });
    io && io.to(`driver_${req.driver._id}`).emit('driver-left-area', { driverId: req.driver._id, hostId: prev });

    return res.status(200).json({ message: 'Left area', data: sanitizeDriver(req.driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to leave area', details: err.message });
  }
});

// POST '/set-status' — on_leave / on_duty / delay
router.post('/set-status', driverAuth, async (req, res) => {
  try {
    const { type, minutes } = req.body || {};
    if (!type) return res.status(400).json({ error: 'type is required' });

    if (type === 'on_leave') {
      req.driver.currentStatusMessage = 'on leave';
      req.driver.isOnDuty = false;
    } else if (type === 'on_duty') {
      req.driver.currentStatusMessage = 'on duty';
      req.driver.isOnDuty = true;
    } else if (type === 'delay') {
      const mins = parseInt(minutes, 10) || 0;
      const start = new Date(Date.now() + mins * 60000);
      req.driver.scheduledStart = start;
      req.driver.currentStatusMessage = `starting in ${mins}m`;

      // Best-effort demo timer: emit 5-min warning before scheduled start
      // In production, use a reliable scheduler / job queue.
      const io = req.app.get('io');
      const msUntilWarning = Math.max(0, start.getTime() - Date.now() - 5 * 60000);
      setTimeout(() => {
        io && io.to(`driver_${req.driver._id}`).emit('start-warning', { message: 'Your journey starts in 5 minutes.' });
      }, msUntilWarning);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    await req.driver.save();
    return res.status(200).json({ message: 'Status updated', data: sanitizeDriver(req.driver) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to set status', details: err.message });
  }
});

// POST '/start-journey' — start duty
router.post('/start-journey', driverAuth, async (req, res) => {
  try {
    req.driver.isOnDuty = true;
    req.driver.status = 'active';
    await req.driver.save();
    return res.status(200).json({ message: 'Journey started. Open socket to publish location updates.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start journey', details: err.message });
  }
});

// POST '/stop-journey' — stop duty
router.post('/stop-journey', driverAuth, async (req, res) => {
  try {
    req.driver.isOnDuty = false;
    await req.driver.save();
    return res.status(200).json({ message: 'Journey stopped' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to stop journey', details: err.message });
  }
});

// POST '/location' — save and emit one-off location
router.post('/location', driverAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng (numbers) are required' });
    }
    req.driver.locationHistory = req.driver.locationHistory || [];
    req.driver.locationHistory.push({ lat, lng, ts: new Date() });
    await req.driver.save();

    const io = req.app.get('io');
    const hostId = req.driver.assignedArea ? req.driver.assignedArea.toString() : null;
    if (hostId) {
      io && io.to(`area_${hostId}`).emit('location-update', { driverId: req.driver._id, lat, lng, ts: Date.now() });
    }

    return res.status(200).json({ message: 'Location saved', data: { lat, lng } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save location', details: err.message });
  }
});

// POST '/start-location' — begin sending live locations (driver must be accepted and assigned)
router.post('/start-location', driverAuth, async (req, res) => {
  try {
    if (req.driver.status !== 'accepted' || !req.driver.assignedArea) {
      return res.status(400).json({ error: 'You must be accepted and assigned to an area to start location sharing' });
    }
    const { lat, lng } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng (numbers) are required' });
    }
    // Save history
    req.driver.locationHistory = req.driver.locationHistory || [];
    req.driver.locationHistory.push({ lat, lng, ts: new Date() });
    // Save recent live location samples
    req.driver.liveLocations = req.driver.liveLocations || [];
    req.driver.liveLocations.push({ lat, lng, ts: new Date() });
    // Keep liveLocations bounded (e.g., last 300 samples ~5 minutes at 1s)
    if (req.driver.liveLocations.length > 300) {
      req.driver.liveLocations = req.driver.liveLocations.slice(-300);
    }
    await req.driver.save();

    // Broadcast to area room
    const io = req.app.get('io');
    const hostId = req.driver.assignedArea.toString();
    io && io.to(`area_${hostId}`).emit('location-update', { driverId: req.driver._id, lat, lng, ts: Date.now() });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start location sharing', details: err.message });
  }
});

// DELETE '/:id' — host-only delete driver
router.delete('/:id', async (req, res) => {
  try {
    if (!requireHostToken(req, res)) return;
    const { id } = req.params;
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Clean up host references if assigned
    if (driver.assignedArea) {
      const host = await Host.findById(driver.assignedArea);
      if (host) {
        host.numberOfDrivers = Math.max(0, (host.numberOfDrivers || 0) - 1);
        if (Array.isArray(host.drivers)) {
          host.drivers = host.drivers.filter(did => did.toString() !== driver._id.toString());
        }
        await host.save();
      }
    }

    await Driver.deleteOne({ _id: driver._id });

    // Notify the driver client (if connected) about removal
    const io = req.app.get('io');
    io && io.to(`driver_${driver._id}`).emit('driver-removed', { message: 'Due to some unconventional things you have been removed from the driving area.' });

    return res.status(200).json({ message: 'Driver deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete driver', details: err.message });
  }
});

module.exports = router;
