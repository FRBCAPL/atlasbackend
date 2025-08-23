import Location from '../models/Location.js';

// Get all active locations
export const getLocations = async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      locations: locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
};

// Get all locations (including inactive) - for admin use
export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.json({
      success: true,
      locations: locations
    });
  } catch (error) {
    console.error('Error fetching all locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
};

// Create a new location
export const createLocation = async (req, res) => {
  try {
    const { name, address, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Check if location with same name already exists
    const existingLocation = await Location.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: 'A location with this name already exists'
      });
    }

    const location = new Location({
      name: name.trim(),
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    await location.save();

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      location: location
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create location'
    });
  }
};

// Update a location
export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, notes, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location name is required'
      });
    }

    // Check if location exists
    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if another location with same name exists (excluding current location)
    const existingLocation = await Location.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: 'A location with this name already exists'
      });
    }

    // Update location
    location.name = name.trim();
    location.address = address ? address.trim() : '';
    location.notes = notes ? notes.trim() : '';
    if (typeof isActive === 'boolean') {
      location.isActive = isActive;
    }

    await location.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: location
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location'
    });
  }
};

// Delete a location
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Instead of actually deleting, we'll deactivate it
    // This prevents issues with existing user registrations
    location.isActive = false;
    await location.save();

    res.json({
      success: true,
      message: 'Location deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete location'
    });
  }
};

// Get a single location by ID
export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      location: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location'
    });
  }
};
