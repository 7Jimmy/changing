

import Room from '../models/room.js';
import DayTimeSlot from '../models/daytimeslot.js';
import Calendar from '../models/calender.js';
import fs from 'fs/promises';
import path from 'path';

// Create a new room with time slots
const createRoom = async (req, res) => {
  try {
    const { 
      roomName, 
      roomCapacity, 
      roomStatus, 
      availableTimeSlots, 
      pricePerSession, 
      amenities 
    } = req.body;

    // Validate required fields
    if (!roomName || !roomCapacity || !pricePerSession) {
      return res.status(400).json({
        success: false,
        message: 'Room name, room capacity, and price per session are required.'
      });
    }

    // Validate time slots exist if provided
    if (availableTimeSlots && availableTimeSlots.length > 0) {
      const slots = await DayTimeSlot.find({ 
        _id: { $in: availableTimeSlots }, 
        isActive: true 
      });
      
      if (slots.length !== availableTimeSlots.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more time slots not found or inactive'
        });
      }
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/rooms/${file.filename}`
      }));
    }

    // Parse amenities if provided as string
    let parsedAmenities = [];
    if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    } else if (typeof amenities === 'string') {
      parsedAmenities = amenities.split(',').map(item => item.trim());
    }

    // Create new room
    const room = new Room({
      roomName: roomName.trim(),
      roomCapacity: parseInt(roomCapacity),
      roomStatus: roomStatus || 'Upcoming',
      availableTimeSlots: availableTimeSlots || [],
      pricePerSession: parseFloat(pricePerSession),
      amenities: parsedAmenities,
      images,
      createdBy: req.user?._id
    });

    await room.save();

    // Populate the saved room
    const populatedRoom = await Room.findById(room._id)
      .populate('availableTimeSlots')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: populatedRoom
    });

  } catch (error) {
    console.error('Create room error:', error);
    
    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      req.files.forEach(async (file) => {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all rooms with their time slots
const getAllRooms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const rooms = await Room.find({ isActive: true })
      .populate('availableTimeSlots')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get available rooms by date and session
const getAvailableRoomsBySession = async (req, res) => {
  try {
    const { date, dayTime } = req.query;

    if (!date || !dayTime) {
      return res.status(400).json({
        success: false,
        message: 'Date and dayTime are required parameters'
      });
    }

    // Find time slots for the specific date and session
    const timeSlots = await DayTimeSlot.find({
      date: new Date(date),
      dayTime: dayTime,
      isActive: true
    });

    if (timeSlots.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active time slots found for ${dayTime} on ${date}`
      });
    }

    const timeSlotIds = timeSlots.map(slot => slot._id);

    // Find rooms that have these time slots available
    const rooms = await Room.find({
      isActive: true,
      availableTimeSlots: { $in: timeSlotIds }
    }).populate({
      path: 'availableTimeSlots',
      match: { _id: { $in: timeSlotIds } }
    });

    // Find calendar entries to check availability
    const calendarEntries = await Calendar.find({
      timeSlot: { $in: timeSlotIds }
    });

    // Build response with availability information
    const availableRooms = rooms.map(room => {
      const timeSlotAvailability = room.availableTimeSlots.map(slot => {
        // Find calendar entry for this room and time slot
        const calendarEntry = calendarEntries.find(
          entry => entry.room.equals(room._id) && entry.timeSlot.equals(slot._id)
        );

        let availability;
        if (calendarEntry) {
          availability = {
            totalCapacity: calendarEntry.totalCapacity,
            seatsBooked: calendarEntry.seatsBooked,
            roomAvailable: calendarEntry.roomAvailable,
            isAvailable: calendarEntry.roomAvailable > 0
          };
        } else {
          // No calendar entry means the room is fully available
          availability = {
            totalCapacity: room.roomCapacity,
            seatsBooked: 0,
            roomAvailable: room.roomCapacity,
            isAvailable: true
          };
        }

        return {
          slotId: slot._id,
          date: slot.formattedDate,
          day: slot.day,
          dayTime: slot.dayTime,
          slotName: slot.slotName,
          timeRange: slot.timeRange,
          duration: slot.duration,
          ...availability
        };
      });

      return {
        roomId: room._id,
        roomName: room.roomName,
        roomCapacity: room.roomCapacity,
        roomStatus: room.roomStatus,
        pricePerSession: room.pricePerSession,
        amenities: room.amenities,
        images: room.images,
        timeSlots: timeSlotAvailability,
        hasAvailability: timeSlotAvailability.some(slot => slot.isAvailable)
      };
    }).filter(room => room.hasAvailability);

    res.status(200).json({
      success: true,
      data: {
        date: date,
        dayTime: dayTime,
        availableRooms,
        totalAvailableRooms: availableRooms.length
      },
      message: `Available rooms for ${dayTime} on ${date} retrieved successfully`
    });

  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get room by ID with available time slots
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('availableTimeSlots');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or inactive'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { 
      roomName, 
      roomCapacity, 
      roomStatus, 
      availableTimeSlots, 
      pricePerSession, 
      amenities 
    } = req.body;
    
    const roomId = req.params.id;

    const room = await Room.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or inactive'
      });
    }

    // Validate time slots exist if provided
    if (availableTimeSlots && availableTimeSlots.length > 0) {
      const slots = await DayTimeSlot.find({ 
        _id: { $in: availableTimeSlots }, 
        isActive: true 
      });
      
      if (slots.length !== availableTimeSlots.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more time slots not found or inactive'
        });
      }
    }

    // Parse amenities if provided as string
    let parsedAmenities = room.amenities;
    if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    } else if (typeof amenities === 'string') {
      parsedAmenities = amenities.split(',').map(item => item.trim());
    }

    // Update fields if provided
    if (roomName) room.roomName = roomName.trim();
    if (roomCapacity) room.roomCapacity = parseInt(roomCapacity);
    if (roomStatus) room.roomStatus = roomStatus;
    if (availableTimeSlots) room.availableTimeSlots = availableTimeSlots;
    if (pricePerSession) room.pricePerSession = parseFloat(pricePerSession);
    if (amenities) room.amenities = parsedAmenities;

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: `/uploads/rooms/${file.filename}`
      }));
      room.images = [...room.images, ...newImages];
    }

    await room.save();

    // Populate the updated room
    const updatedRoom = await Room.findById(roomId)
      .populate('availableTimeSlots')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: updatedRoom
    });

  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete room (soft delete)
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isActive: true });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or already inactive'
      });
    }

    // Check if room has any future bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timeSlots = await DayTimeSlot.find({
      _id: { $in: room.availableTimeSlots },
      date: { $gte: today }
    });
    
    const timeSlotIds = timeSlots.map(slot => slot._id);
    
    const existingBookings = await Calendar.find({
      room: room._id,
      timeSlot: { $in: timeSlotIds },
      seatsBooked: { $gt: 0 }
    });
    
    if (existingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with existing bookings. Cancel all bookings first.'
      });
    }

    // Soft delete
    room.isActive = false;
    await room.save();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete room image
const deleteRoomImage = async (req, res) => {
  try {
    const { roomId, imageId } = req.params;
    
    const room = await Room.findOne({ _id: roomId, isActive: true });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or inactive'
      });
    }

    const imageIndex = room.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = room.images[imageIndex];
    
    // Delete file from storage
    try {
      const filePath = path.join(process.cwd(), 'uploads/rooms', image.filename);
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Remove from database
    room.images.splice(imageIndex, 1);
    await room.save();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  deleteRoomImage,
  getAvailableRoomsBySession
};