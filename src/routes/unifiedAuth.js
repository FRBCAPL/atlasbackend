import express from 'express';
import {
  unifiedLogin,
  getUnifiedUserStatus,
  claimUnifiedAccount,
  updateUnifiedProfile,
  changeUnifiedPin,
  // Admin endpoints
  getAllUnifiedUsers,
  searchUnifiedUsers,
  getUnifiedUserProfile,
  addUnifiedUser,
  updateUnifiedUser,
  deleteUnifiedUser,
  getUnifiedSystemStats
} from '../controllers/unifiedAuthController.js';

const router = express.Router();

// Unified login endpoint
router.post('/login', unifiedLogin);

// Get unified user status
router.get('/user-status/:email', getUnifiedUserStatus);

// Claim unified account
router.post('/claim-account', claimUnifiedAccount);

// Update unified profile
router.put('/update-profile', updateUnifiedProfile);

// Change unified PIN
router.put('/change-pin', changeUnifiedPin);

// ============================================================================
// ADMIN ROUTES FOR UNIFIED USER MANAGEMENT
// ============================================================================

// Get all unified users
router.get('/all-users', getAllUnifiedUsers);

// Search unified users
router.get('/search-users', searchUnifiedUsers);

// Get unified user profile
router.get('/user-profile/:userId', getUnifiedUserProfile);

// Add new unified user
router.post('/admin/add-user', addUnifiedUser);

// Update unified user
router.put('/admin/update-user/:userId', updateUnifiedUser);

// Delete unified user
router.delete('/admin/delete-user/:userId', deleteUnifiedUser);

// Get unified system statistics
router.get('/admin/system-stats', getUnifiedSystemStats);

export default router;
