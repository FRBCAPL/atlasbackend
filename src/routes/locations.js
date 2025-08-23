import express from 'express';
import {
  getLocations,
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationById
} from '../controllers/locationController.js';

const router = express.Router();

// Public routes (for registration form)
router.get('/', getLocations); // Get active locations only

// Admin routes (for location management)
router.get('/admin/all', getAllLocations); // Get all locations including inactive
router.post('/', createLocation); // Create new location
router.get('/:id', getLocationById); // Get specific location
router.put('/:id', updateLocation); // Update location
router.delete('/:id', deleteLocation); // Delete (deactivate) location

export default router;
