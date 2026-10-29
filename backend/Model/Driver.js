const mongoose = require('mongoose');

// Driver schema captures registration info, application status, assignment, and journey state
const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true }, // store hashed password only
  driverPhoto: { type: String, default: null }, // base64 or URL
  vehiclePhoto: { type: String, default: null },
  experience: { type: String, default: '' }, // free-form text

  status: { type: String, enum: ['pending','accepted','rejected','active'] },
  isAccepted: { type: Boolean, default: false },
  appliedAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String, default: null },

  assignedArea: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', default: null },
  currentStatusMessage: { type: String, default: null },
  scheduledStart: { type: Date, default: null },
  isOnDuty: { type: Boolean, default: false },

  locationHistory: [{
    lat: Number,
    lng: Number,
    ts: { type: Date, default: Date.now }
  }]
  ,
  liveLocations: [{
    lat: Number,
    lng: Number,
    ts: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
