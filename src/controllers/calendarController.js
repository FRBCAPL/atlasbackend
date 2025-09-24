import Calendar from '../models/Calendar.js';

// Get calendar events for a user
export const getUserEvents = async (req, res) => {
  try {
    const { userId, startDate, endDate, eventType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const filter = { userId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Add event type filter if provided
    if (eventType) {
      filter.eventType = eventType;
    }

    const events = await Calendar.find(filter)
      .sort({ date: 1, startTime: 1 })
      .lean();

    res.json({ success: true, events });
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
};

// Create a new calendar event
export const createEvent = async (req, res) => {
  try {
    const eventData = req.body;
    
    if (!eventData.userId || !eventData.title || !eventData.date || !eventData.startTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const event = new Calendar(eventData);
    await event.save();

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
};

// Update a calendar event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Calendar.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    res.json({ success: true, event });
  } catch (err) {
    console.error('Error updating calendar event:', err);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
};

// Delete a calendar event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Calendar.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
};

// Get events for a specific date range (for calendar view)
export const getEventsByDateRange = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ error: 'User ID, start date, and end date are required' });
    }

    const events = await Calendar.find({
      userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .sort({ date: 1, startTime: 1 })
    .lean();

    res.json({ success: true, events });
  } catch (err) {
    console.error('Error fetching events by date range:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Add a match to the calendar (for approved match scheduling requests)
export const addMatchToCalendar = async (req, res) => {
  try {
    const { title, description, location, startDateTime, endDateTime, matchDetails } = req.body;
    
    if (!title || !startDateTime) {
      return res.status(400).json({ error: 'Title and start date/time are required' });
    }

    // Create calendar events for both players
    const challengerName = matchDetails?.challenger || 'Unknown';
    const defenderName = matchDetails?.defender || 'Unknown';
    
    const events = [];
    
    // Create event for challenger
    const challengerEvent = new Calendar({
      userId: challengerName,
      eventType: 'match',
      title: title,
      description: description || '',
      date: new Date(startDateTime),
      startTime: new Date(startDateTime).toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
      endTime: endDateTime ? new Date(endDateTime).toTimeString().split(' ')[0].substring(0, 5) : null,
      location: location || '',
      matchDetails: {
        opponent: defenderName,
        gameType: matchDetails?.matchType || 'challenge',
        raceLength: 'TBD',
        division: matchDetails?.division || 'N/A',
        proposalId: matchDetails?.proposalId
      }
    });
    
    // Create event for defender
    const defenderEvent = new Calendar({
      userId: defenderName,
      eventType: 'match',
      title: title,
      description: description || '',
      date: new Date(startDateTime),
      startTime: new Date(startDateTime).toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
      endTime: endDateTime ? new Date(endDateTime).toTimeString().split(' ')[0].substring(0, 5) : null,
      location: location || '',
      matchDetails: {
        opponent: challengerName,
        gameType: matchDetails?.matchType || 'challenge',
        raceLength: 'TBD',
        division: matchDetails?.division || 'N/A',
        proposalId: matchDetails?.proposalId
      }
    });

    await challengerEvent.save();
    await defenderEvent.save();
    
    events.push(challengerEvent, defenderEvent);

    console.log(`✅ Added match to calendar: ${title} on ${startDateTime}`);

    res.status(201).json({ 
      success: true, 
      message: 'Match added to calendar successfully',
      events: events 
    });
  } catch (err) {
    console.error('Error adding match to calendar:', err);
    res.status(500).json({ error: 'Failed to add match to calendar' });
  }
};