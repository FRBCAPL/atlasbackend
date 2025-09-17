import express from 'express';
import {
  unifiedLogin,
  unifiedSignup,
  getUnifiedUserStatus,
  claimUnifiedAccount,
  updateUnifiedProfile,
  changeUnifiedPin,
  copyProfileData,
  checkProfileCompleteness,
  getProfileData,
  // Admin endpoints
  getAllUnifiedUsers,
  searchUnifiedUsers,
  getUnifiedUserProfile,
  addUnifiedUser,
  updateUnifiedUser,
  deleteUnifiedUser,
  softDeleteUnifiedUser,
  getUnifiedSystemStats
} from '../controllers/unifiedAuthController.js';

const router = express.Router();

// Unified login endpoint
router.post('/login', unifiedLogin);

// Unified signup endpoint
router.post('/signup', unifiedSignup);

// Get unified user status
router.get('/user-status/:email', getUnifiedUserStatus);

// Claim unified account
router.post('/claim-account', claimUnifiedAccount);

// Update unified profile
router.put('/update-profile', updateUnifiedProfile);
router.post('/update-profile', updateUnifiedProfile); // Also allow POST method
router.put('/profile/:userId', updateUnifiedProfile); // Alternative route for profile updates
router.post('/profile/:userId', updateUnifiedProfile); // Also allow POST method

// Change unified PIN
router.put('/change-pin', changeUnifiedPin);

// Copy profile data between apps
router.post('/copy-profile', copyProfileData);

// Get profile data
router.get('/profile-data', getProfileData);

// Check profile completeness
router.get('/check-profile/:appType', checkProfileCompleteness);

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

// Soft delete unified user (move to deleted_users collection)
router.put('/admin/soft-delete-user/:userId', softDeleteUnifiedUser);

// Get unified system statistics
router.get('/admin/system-stats', getUnifiedSystemStats);

export default router;
