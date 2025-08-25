import Payment from '../models/Payment.js';
import User from '../models/User.js';

// Payment validation function
const validatePaymentData = (data) => {
  const errors = [];

  // Required fields
  if (!data.playerId) errors.push('Player ID is required');
  if (!data.playerName) errors.push('Player name is required');
  if (!data.division) errors.push('Division is required');
  if (!data.session) errors.push('Session is required');
  if (!data.amount || data.amount <= 0) errors.push('Valid amount is required');
  if (!data.paymentType) errors.push('Payment type is required');
  if (!data.paymentMethod) errors.push('Payment method is required');

  // Payment type validation
  const validPaymentTypes = [
    'registration_fee',
    'weekly_dues',
    'participation_fee',
    'pre_payment',
    'late_payment_fee',
    'no_show_fee',
    'late_cancellation_fee',
    'reschedule_fee',
    'penalty_fee',
    'refund'
  ];

  if (!validPaymentTypes.includes(data.paymentType)) {
    errors.push('Invalid payment type');
  }

  // Payment method validation
  const validPaymentMethods = [
    'cash',
    'venmo',
    'cashapp',
    'credit_card',
    'debit_card',
    'check',
    'online'
  ];

  if (!validPaymentMethods.includes(data.paymentMethod)) {
    errors.push('Invalid payment method');
  }

  // Week number validation for weekly dues
  if (data.paymentType === 'weekly_dues') {
    if (!data.weekNumber || data.weekNumber < 1 || data.weekNumber > 10) {
      errors.push('Week number must be between 1 and 10 for weekly dues');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get all payments for a player
export const getPlayerPayments = async (req, res) => {
  try {
    const { playerId, session } = req.params;
    
    const payments = await Payment.find({ 
      playerId, 
      session 
    }).sort({ createdAt: -1 });
    
    const summary = await Payment.getPlayerSummary(playerId, session);
    
    res.json({
      success: true,
      payments,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get division payment summary
export const getDivisionPayments = async (req, res) => {
  try {
    const { division, session } = req.params;
    
    const payments = await Payment.find({ 
      division, 
      session 
    }).populate('playerId', 'firstName lastName email');
    
    const summary = await Payment.getDivisionSummary(division, session);
    
    res.json({
      success: true,
      payments,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Record a new payment
export const recordPayment = async (req, res) => {
  try {
    const {
      playerId,
      playerName,
      division,
      session,
      amount,
      paymentType,
      paymentMethod,
      weekNumber,
      dueDate,
      referenceNumber,
      location,
      notes
    } = req.body;

    // Validate payment data
    const validation = validatePaymentData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        details: validation.errors
      });
    }

    // Check if payment already exists for this week (for weekly dues)
    if (paymentType === 'weekly_dues' && weekNumber) {
      const existingPayment = await Payment.findOne({
        playerId,
        session,
        weekNumber,
        paymentType: 'weekly_dues'
      });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          error: 'Payment already recorded for this week'
        });
      }
    }

    // Create payment record
    const payment = new Payment({
      playerId,
      playerName,
      division,
      session,
      amount,
      paymentType,
      paymentMethod,
      weekNumber,
      dueDate: new Date(dueDate),
      referenceNumber,
      location,
      notes,
      recordedBy: req.user?.name || 'admin',
      status: 'paid',
      paymentDate: new Date()
    });

    // Check if payment is on time (for weekly dues)
    if (paymentType === 'weekly_dues') {
      const dueDate = new Date(dueDate);
      const sunday10PM = new Date(dueDate);
      sunday10PM.setHours(22, 0, 0, 0); // 10:00 PM
      
      payment.isOnTime = new Date() <= sunday10PM;
      payment.isLate = !payment.isOnTime;
    }

    await payment.save();

    // Update user payment status if needed
    if (paymentType === 'registration_fee') {
      await User.findByIdAndUpdate(playerId, {
        hasPaidRegistrationFee: true,
        paymentStatus: 'paid'
      });
    }

    res.json({
      success: true,
      payment,
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Record weekly dues for all players in a division
export const recordWeeklyDues = async (req, res) => {
  try {
    const { division, session, weekNumber } = req.body;
    
    if (!weekNumber || weekNumber < 1 || weekNumber > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week number (must be 1-10)'
      });
    }

    // Get all players in the division
    const players = await User.find({ 
      division, 
      isApproved: true, 
      isActive: true 
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (7 - dueDate.getDay())); // Next Sunday
    dueDate.setHours(22, 0, 0, 0); // 10:00 PM

    const payments = [];

    for (const player of players) {
      // Check if payment already exists for this week
      const existingPayment = await Payment.findOne({
        playerId: player._id,
        session,
        weekNumber,
        paymentType: 'weekly_dues'
      });

      if (!existingPayment) {
        const payment = new Payment({
          playerId: player._id,
          playerName: `${player.firstName} ${player.lastName}`,
          division,
          session,
          amount: 10, // $10 weekly dues
          paymentType: 'weekly_dues',
          paymentMethod: 'pending',
          weekNumber,
          dueDate,
          status: 'pending',
          recordedBy: req.user?.name || 'admin'
        });

        payments.push(payment);
      }
    }

    if (payments.length > 0) {
      await Payment.insertMany(payments);
    }

    res.json({
      success: true,
      message: `Weekly dues recorded for ${payments.length} players`,
      paymentsCreated: payments.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Apply late payment fees
export const applyLateFees = async (req, res) => {
  try {
    const { division, session } = req.body;
    
    // Find all overdue weekly dues
    const overduePayments = await Payment.find({
      division,
      session,
      paymentType: 'weekly_dues',
      status: 'pending',
      dueDate: { $lt: new Date() }
    });

    const lateFees = [];

    for (const payment of overduePayments) {
      // Check if late fee already applied
      const existingLateFee = await Payment.findOne({
        playerId: payment.playerId,
        session,
        paymentType: 'late_payment_fee',
        referenceNumber: `late_fee_${payment._id}`
      });

      if (!existingLateFee) {
        const lateFee = new Payment({
          playerId: payment.playerId,
          playerName: payment.playerName,
          division,
          session,
          amount: 5, // $5 late fee
          paymentType: 'late_payment_fee',
          paymentMethod: 'pending',
          dueDate: new Date(),
          status: 'pending',
          referenceNumber: `late_fee_${payment._id}`,
          notes: `Late fee for week ${payment.weekNumber} dues`,
          recordedBy: req.user?.name || 'admin'
        });

        lateFees.push(lateFee);
      }
    }

    if (lateFees.length > 0) {
      await Payment.insertMany(lateFees);
    }

    res.json({
      success: true,
      message: `Late fees applied to ${lateFees.length} overdue payments`,
      lateFeesApplied: lateFees.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Check payment compliance for match eligibility
export const checkMatchEligibility = async (req, res) => {
  try {
    const { playerId, session } = req.params;
    
    const summary = await Payment.getPlayerSummary(playerId, session);
    
    // Check if player is in good standing
    const isEligible = summary.isInGoodStanding;
    
    res.json({
      success: true,
      isEligible,
      summary,
      message: isEligible ? 
        'Player is eligible for matches' : 
        'Player has overdue payments and is not eligible for matches'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    const { division, session } = req.params;
    
    const summary = await Payment.getDivisionSummary(division, session);
    
    // Get detailed breakdown
    const paymentBreakdown = await Payment.aggregate([
      { $match: { division, session } },
      { $group: {
        _id: '$paymentType',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        paidAmount: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] 
          } 
        },
        pendingAmount: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] 
          } 
        }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      summary,
      breakdown: paymentBreakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, notes, verifiedBy } = req.body;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    payment.status = status;
    if (notes) payment.notes = notes;
    if (verifiedBy) {
      payment.verifiedBy = verifiedBy;
      payment.verificationDate = new Date();
    }

    await payment.save();

    res.json({
      success: true,
      payment,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete payment (admin only)
export const deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findByIdAndDelete(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
