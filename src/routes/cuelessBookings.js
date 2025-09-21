import express from 'express';
import CuelessBooking from '../models/CuelessBooking.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create a new booking request
router.post('/bookings', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      eventType,
      eventDate,
      endDate,
      eventTime,
      endTime,
      location,
      numberOfMatches,
      budget,
      specialRequests,
      agreeToTerms,
      // Player Information
      playerNames,
      player1,
      player2,
      // Tournament Information
      tournamentDirector,
      assistantDirector,
      tournamentName,
      // Team League Information
      teamName,
      opponentTeamName,
      leagueName,
      matchType,
      format1,
      format2,
      // Other Event Information
      eventDescription,
      // Venue Information
      venueName,
      venueCity,
      venueState,
      venueAwareness,
      // Multi-day flag
      isMultiDay,
      // Venue Contact Information
      venueContactName,
      venueContactEmail,
      venueContactPhone,
      // Camera count
      numberOfCameras
    } = req.body;

    // Validate required fields
    if (!name || !email || !eventDate || !eventTime || !location || !agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate event date is not in the past
    const eventDateTime = new Date(eventDate + 'T' + eventTime);
    if (eventDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past'
      });
    }

    // Create new booking
    const booking = new CuelessBooking({
      name,
      email,
      phone,
      eventType,
      eventDate: new Date(eventDate),
      endDate: endDate ? new Date(endDate) : undefined,
      eventTime,
      endTime,
      location,
      numberOfMatches,
      budget,
      specialRequests,
      agreeToTerms,
      // Player Information
      playerNames,
      player1,
      player2,
      // Tournament Information
      tournamentDirector,
      assistantDirector,
      tournamentName,
      // Team League Information
      teamName,
      opponentTeamName,
      leagueName,
      matchType,
      format1,
      format2,
      // Other Event Information
      eventDescription,
      // Venue Information
      venueName,
      venueCity,
      venueState,
      venueAwareness,
      // Multi-day flag
      isMultiDay,
      // Venue Contact Information
      venueContactName,
      venueContactEmail,
      venueContactPhone,
      // Camera count
      numberOfCameras
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      booking: {
        id: booking._id,
        name: booking.name,
        email: booking.email,
        eventType: booking.eventType,
        eventDate: booking.eventDate,
        status: booking.status
      }
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all bookings (admin only)
router.get('/bookings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const bookings = await CuelessBooking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CuelessBooking.countDocuments(query);

    res.json({
      success: true,
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get a specific booking (admin only)
router.get('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await CuelessBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update booking status (admin only)
router.patch('/bookings/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await CuelessBooking.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        adminNotes: adminNotes || undefined
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete booking (admin only)
router.delete('/bookings/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const booking = await CuelessBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
