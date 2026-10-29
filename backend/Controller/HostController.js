const express = require('express');
const router = express.Router();
const Host = require('../Model/Host');

// PLACEHOLDER AUTH - Replace with real authentication for production
const DEFAULT_HOST_CREDENTIALS = {
  id: "sandesh",
  password: "sandesh@1230",
  token: "HOST_TOKEN_SANDESH"
};

// Auth middleware to protect routes
const hostAuth = (req, res, next) => {
  const token = req.headers['x-host-token'];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.' 
    });
  }
  
  if (token !== DEFAULT_HOST_CREDENTIALS.token) {
    return res.status(403).json({ 
      error: 'Invalid token.' 
    });
  }
  
  next();
};

// Login route - accepts { id, password }
router.post('/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    
    if (!id || !password) {
      return res.status(400).json({
        error: 'ID and password are required'
      });
    }
    
    if (id === DEFAULT_HOST_CREDENTIALS.id && password === DEFAULT_HOST_CREDENTIALS.password) {
      return res.status(200).json({
        token: DEFAULT_HOST_CREDENTIALS.token,
        message: 'Login successful'
      });
    }
    
    return res.status(401).json({
      error: 'Invalid credentials'
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Server error during login',
      details: error.message
    });
  }
});

// POST '/' - Create a new area
router.post('/', hostAuth, async (req, res) => {
  try {
    const { areaName, areaType, location, boundary, createdBy } = req.body;
    
    // Validate required fields
    if (!areaName) {
      return res.status(400).json({ error: 'areaName is required' });
    }
    if (!areaType) {
      return res.status(400).json({ error: 'areaType is required' });
    }
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'location with lat and lng is required' });
    }
    if (!createdBy) {
      return res.status(400).json({ error: 'createdBy is required' });
    }
    
    const newHost = new Host({
      areaName,
      areaType,
      location,
      boundary: boundary || [],
      createdBy
    });
    
    const savedHost = await newHost.save();
    res.status(201).json({
      message: 'Area created successfully',
      data: savedHost
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create area',
      details: error.message
    });
  }
});

// GET '/' - Fetch all areas (support query ?createdBy=sandesh)
// Note: GET is intentionally NOT auth-protected for demo, but requires a createdBy filter for safety
router.get('/', async (req, res) => {
  try {
    const { createdBy } = req.query;
    if (!createdBy) {
      return res.status(400).json({ error: 'Query parameter createdBy is required' });
    }
    const filter = { createdBy };
    
    const hosts = await Host.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json({
      message: 'Areas fetched successfully',
      data: hosts,
      count: hosts.length
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch areas',
      details: error.message
    });
  }
});

// PUT '/:id' - Update an area
router.put('/:id', hostAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { areaName, areaType, location, boundary } = req.body;
    
    const updateData = {};
    if (areaName) updateData.areaName = areaName;
    if (areaType) updateData.areaType = areaType;
    if (location) updateData.location = location;
    if (boundary !== undefined) updateData.boundary = boundary;
    
    const updatedHost = await Host.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedHost) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    res.status(200).json({
      message: 'Area updated successfully',
      data: updatedHost
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid area ID' });
    }
    res.status(500).json({
      error: 'Failed to update area',
      details: error.message
    });
  }
});

// DELETE '/:id' - Delete an area
router.delete('/:id', hostAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedHost = await Host.findByIdAndDelete(id);
    
    if (!deletedHost) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    res.status(200).json({
      message: 'Area deleted successfully',
      data: deletedHost
    });
    
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid area ID' });
    }
    res.status(500).json({
      error: 'Failed to delete area',
      details: error.message
    });
  }
});

module.exports = router;
