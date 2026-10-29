const mongoose = require('mongoose');

const hostSchema = new mongoose.Schema({
  areaName: {
    type: String,
    required: true,
    trim: true
  },
  areaType: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  boundary: [{
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  }],
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  // Driver integration fields
  // Total number of drivers currently assigned to this area
  numberOfDrivers: {
    type: Number,
    default: 0
  },
  // Optional: list of driver ObjectIds assigned to this area
  drivers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Host', hostSchema);
