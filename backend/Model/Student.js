const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  photo: { type: String, default: null },
  // Temporary, dynamic selections that can change as the student switches choices
  waitingForDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  selectedArea: { type: mongoose.Schema.Types.ObjectId, ref: 'Host', default: null },
  selectionNote: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
