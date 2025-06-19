


import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    trim: true
  },
  roomCapacity: {
    type: Number,
    required: true,
    min: 1,
    max: 500
  },
  roomStatus: {
    type: String,
    required: true,
    enum: ['Upcoming', 'Cancelled', 'Completed'],
    default: 'Upcoming'
  },
  // Replace simple slotTime with relationship to DayTimeSlot
  availableTimeSlots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DayTimeSlot'
  }],
  pricePerSession: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: {
    type: [String], // Changed to array of strings for better structure
    default: []
  },
  images: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to get current availability 
roomSchema.virtual('currentAvailability').get(function() {
  // This will be populated by the controller based on calendar entries
  return this._currentAvailability || 'Check calendar for availability';
});

export default mongoose.model('Room', roomSchema);