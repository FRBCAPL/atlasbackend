import express from 'express';
import {
  getPlayerPayments,
  getDivisionPayments,
  recordPayment,
  recordWeeklyDues,
  applyLateFees,
  checkMatchEligibility,
  getPaymentStats,
  updatePaymentStatus,
  deletePayment
} from '../controllers/paymentController.js';

const router = express.Router();

// Basic payments endpoint for testing
router.get('/', (req, res) => {
  res.json({ 
    message: 'Payments API is working!',
    endpoints: [
      '/player/:playerId/:session',
      '/division/:division/:session', 
      '/stats/:division/:session',
      '/eligibility/:playerId/:session'
    ]
  });
});

// Get player payments
router.get('/player/:playerId/:session', getPlayerPayments);

// Get division payments
router.get('/division/:division/:session', getDivisionPayments);

// Get payment statistics
router.get('/stats/:division/:session', getPaymentStats);

// Check match eligibility
router.get('/eligibility/:playerId/:session', checkMatchEligibility);

// Record a payment
router.post('/record', recordPayment);

// Record weekly dues for all players
router.post('/weekly-dues', recordWeeklyDues);

// Apply late fees
router.post('/apply-late-fees', applyLateFees);

// Update payment status
router.patch('/:paymentId/status', updatePaymentStatus);

// Delete payment (admin only)
router.delete('/:paymentId', deletePayment);

export default router;
