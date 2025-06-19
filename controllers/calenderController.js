

import Calendar from '../models/calender.js';
import Room from '../models/room.js';
import DayTimeSlot from '../models/daytimeslot.js';
import User from '../models/User.js';

// Create calendar entry
const createCalendarEntry = async (req, res) => {
  try {
    const { timeSlot, room, totalCapacity, seatsBooked, bookedBy } = req.body;

    // Validate required fields
    if (!timeSlot || !room) {
      return res.status(400).json({
        success: false,
        message: 'Time slot and room are required'
      });
    }

    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if time slot exists
    const timeSlotExists = await DayTimeSlot.findById(timeSlot);
    if (!timeSlotExists) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found'
      });
    }

    // Check if calendar entry already exists
    const existingEntry = await Calendar.findOne({ timeSlot, room });
    if (existingEntry) {
      return res.status(409).json({
        success: false,
        message: 'Calendar entry already exists for this room and time slot'
      });
    }

    // Create calendar entry
    const calendarEntry = new Calendar({
      timeSlot,
      room,
      totalCapacity: totalCapacity || roomExists.roomCapacity,
      seatsBooked: seatsBooked || 0,
      bookedBy: bookedBy || []
    });

    await calendarEntry.save();

    // Populate the saved entry
    const populatedEntry = await Calendar.findById(calendarEntry._id)
      .populate('room', 'roomName roomCapacity roomStatus')
      .populate('timeSlot', 'date day dayTime slotName startTime endTime')
      .populate('bookedBy.user', 'name email');

    res.status(201).json({
      success: true,
      data: populatedEntry,
      message: 'Calendar entry created successfully'
    });

  } catch (error) {
    console.error('Create calendar entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get calendar entries by date
const getCalendarByDate = async (req, res) => {
  try {
    const { date, dayTime } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required (YYYY-MM-DD format)'
      });
    }

    // Find time slots for the date
    const timeSlotQuery = { 
      date: new Date(date) 
    };
    
    if (dayTime) {
      timeSlotQuery.dayTime = dayTime;
    }
    
    const timeSlots = await DayTimeSlot.find(timeSlotQuery);
    
    if (timeSlots.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No time slots found for ${date}${dayTime ? ` and session ${dayTime}` : ''}`
      });
    }
    
    const timeSlotIds = timeSlots.map(slot => slot._id);

    // Get calendar entries for these time slots
    const calendarEntries = await Calendar.find({
      timeSlot: { $in: timeSlotIds }
    })
      .populate('room', 'roomName roomCapacity roomStatus pricePerSession amenities')
      .populate('timeSlot', 'date day dayTime slotName startTime endTime')
      .populate('bookedBy.user', 'name email');

    // Group entries by day time (Morning, Afternoon, Evening)
    const groupedEntries = {};
    timeSlots.forEach(slot => {
      if (!groupedEntries[slot.dayTime]) {
        groupedEntries[slot.dayTime] = [];
      }
    });

    calendarEntries.forEach(entry => {
      const dayTime = entry.timeSlot.dayTime;
      if (!groupedEntries[dayTime]) {
        groupedEntries[dayTime] = [];
      }
      groupedEntries[dayTime].push(entry);
    });

    // Calculate summary statistics
    const totalBookedSeats = calendarEntries.reduce((total, entry) => total + entry.seatsBooked, 0);
    const totalAvailableSeats = calendarEntries.reduce((total, entry) => total + entry.roomAvailable, 0);

    res.json({
      success: true,
      data: {
        date: date,
        groupedEntries,
        summary: {
          totalEntries: calendarEntries.length,
          totalBookedSeats,
          totalAvailableSeats
        }
      },
      message: `Calendar entries for ${date}${dayTime ? ` and session ${dayTime}` : ''} retrieved successfully`
    });

  } catch (error) {
    console.error('Get calendar by date error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Book seats in a calendar entry
const bookSeats = async (req, res) => {
  try {
    const { calendarId } = req.params;
    const { userId, seats } = req.body;

    if (!userId || !seats || seats < 1) {
      return res.status(400).json({
        success: false,
        message: 'User ID and number of seats (minimum 1) are required'
      });
    }

    const calendarEntry = await Calendar.findById(calendarId);
    if (!calendarEntry) {
      return res.status(404).json({
        success: false,
        message: 'Calendar entry not found'
      });
    }

    // Check if enough seats are available
    if (calendarEntry.roomAvailable < seats) {
      return res.status(400).json({
        success: false,
        message: `Not enough seats available. Only ${calendarEntry.roomAvailable} seats left.`
      });
    }

    // Add booking
    calendarEntry.bookedBy.push({
      user: userId,
      seats: seats,
      bookingDate: new Date()
    });

    // Update seats booked
    calendarEntry.seatsBooked += seats;

    await calendarEntry.save();

    // Populate the updated entry
    const updatedEntry = await Calendar.findById(calendarId)
      .populate('room', 'roomName roomCapacity roomStatus')
      .populate('timeSlot', 'date day dayTime slotName startTime endTime')
      .populate('bookedBy.user', 'name email');

    res.status(200).json({
      success: true,
      data: updatedEntry,
      message: `Successfully booked ${seats} seat(s)`
    });

  } catch (error) {
    console.error('Book seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Cancel booking in a calendar entry
const cancelBooking = async (req, res) => {
  try {
    const { calendarId, bookingId } = req.params;

    const calendarEntry = await Calendar.findById(calendarId);
    if (!calendarEntry) {
      return res.status(404).json({
        success: false,
        message: 'Calendar entry not found'
      });
    }

    // Find the booking
    const bookingIndex = calendarEntry.bookedBy.findIndex(
      booking => booking._id.toString() === bookingId
    );

    if (bookingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Get number of seats to release
    const seatsToRelease = calendarEntry.bookedBy[bookingIndex].seats;

    // Remove booking
    calendarEntry.bookedBy.splice(bookingIndex, 1);

    // Update seats booked
    calendarEntry.seatsBooked = Math.max(0, calendarEntry.seatsBooked - seatsToRelease);

    await calendarEntry.save();

    // Populate the updated entry
    const updatedEntry = await Calendar.findById(calendarId)
      .populate('room', 'roomName roomCapacity roomStatus')
      .populate('timeSlot', 'date day dayTime slotName startTime endTime')
      .populate('bookedBy.user', 'name email');

    res.status(200).json({
      success: true,
      data: updatedEntry,
      message: `Successfully cancelled booking and released ${seatsToRelease} seat(s)`
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Calendar.find({
      'bookedBy.user': userId
    })
      .populate('room', 'roomName roomCapacity roomStatus pricePerSession amenities')
      .populate('timeSlot', 'date day dayTime slotName startTime endTime')
      .sort({ 'timeSlot.date': 1 });

    // Format bookings for easy display
    const formattedBookings = bookings.map(booking => {
      // Find this user's specific booking details
      const userBooking = booking.bookedBy.find(
        b => b.user.toString() === userId
      );

      return {
        bookingId: userBooking._id,
        calendarId: booking._id,
        date: booking.timeSlot.date,
        day: booking.timeSlot.day,
        dayTime: booking.timeSlot.dayTime,
        slotName: booking.timeSlot.slotName,
        timeRange: `${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}`,
        roomName: booking.room.roomName,
        seats: userBooking.seats,
        pricePerSession: booking.room.pricePerSession,
        totalPrice: userBooking.seats * booking.room.pricePerSession,
        bookingDate: userBooking.bookingDate
      };
    });

    res.status(200).json({
      success: true,
      data: {
        bookings: formattedBookings,
        totalBookings: formattedBookings.length
      },
      message: `Retrieved ${formattedBookings.length} bookings for user`
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export {
  createCalendarEntry,
  getCalendarByDate,
  bookSeats,
  cancelBooking,
  getUserBookings
};