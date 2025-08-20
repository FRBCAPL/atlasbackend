import express from 'express';
import * as calendarController from '../controllers/calendarController.js';

const router = express.Router();

// Get user's calendar events
router.get('/events', calendarController.getUserEvents);

// Get events by date range
router.get('/events/range', calendarController.getEventsByDateRange);

// Create a new calendar event
router.post('/events', calendarController.createEvent);

// Update a calendar event
router.put('/events/:id', calendarController.updateEvent);

// Delete a calendar event
router.delete('/events/:id', calendarController.deleteEvent);

export default router;
