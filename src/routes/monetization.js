import express from 'express';
import Membership from '../models/Membership.js';
import PrizePool from '../models/PrizePool.js';
import LadderPlayer from '../models/LadderPlayer.js';
import LadderMatch from '../models/LadderMatch.js';
import PaymentConfig from '../models/PaymentConfig.js';
import PendingClaim from '../models/PendingClaim.js';
import UserCredits from '../models/UserCredits.js';
import PaymentRecord from '../models/PaymentRecord.js';
import PromotionalConfig from '../models/PromotionalConfig.js';
import { 
  createSquarePayment, 
  createSquareCustomer, 
  getSquareCustomerByEmail,
  createSquarePaymentLink,
  getSquarePayment 
} from '../services/squareService.js';

const router = express.Router();

// ============================================================================
// SQUARE PAYMENT INTEGRATION
// ============================================================================

/**
 * Create Square payment for membership
 * POST /api/monetization/square/create-membership-payment
 */
router.post('/square/create-membership-payment', async (req, res) => {
  try {
    const { 
      email, 
      playerName, 
      sourceId, 
      customerId,
      amount = 500 // $5.00 in cents
    } = req.body;
    
    if (!email || !sourceId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and payment source are required'
      });
    }

    // Get or create Square customer
    let squareCustomerId = customerId;
    if (!squareCustomerId) {
      const customerResult = await getSquareCustomerByEmail(email);
      if (!customerResult.success) {
        // Create new customer
        const [firstName, lastName] = playerName.split(' ');
        const createCustomerResult = await createSquareCustomer({
          email,
          firstName: firstName || playerName,
          lastName: lastName || '',
        });
        
        if (!createCustomerResult.success) {
          return res.status(500).json({
            error: 'Failed to create customer',
            message: createCustomerResult.error
          });
        }
        
        squareCustomerId = createCustomerResult.customerId;
      } else {
        squareCustomerId = customerResult.customerId;
      }
    }

    // Create Square payment
    const paymentResult = await createSquarePayment({
      amount: amount,
      sourceId: sourceId,
      idempotencyKey: `mem_${Date.now().toString().slice(-8)}`,
      customerId: squareCustomerId,
      note: `Ladder Membership - ${playerName}`
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        error: 'Payment failed',
        message: paymentResult.error,
        details: paymentResult.details
      });
    }

    // Create or update membership
    let membership = await Membership.findOne({ playerId: email });
    
    if (!membership) {
      membership = new Membership({
        playerId: email,
        tier: 'standard',
        status: 'active',
        amount: amount / 100, // Convert cents to dollars
        startDate: new Date(),
        paymentMethod: 'square',
        squareCustomerId: squareCustomerId,
        squarePaymentId: paymentResult.transactionId,
        paymentHistory: [{
          date: new Date(),
          amount: amount / 100,
          method: 'square',
          transactionId: paymentResult.transactionId,
          verified: true
        }]
      });
    } else {
      membership.status = 'active';
      membership.lastPaymentDate = new Date();
      membership.paymentMethod = 'square';
      membership.squareCustomerId = squareCustomerId;
      membership.squarePaymentId = paymentResult.transactionId;
      
      if (!membership.paymentHistory) {
        membership.paymentHistory = [];
      }
      membership.paymentHistory.push({
        date: new Date(),
        amount: amount / 100,
        method: 'square',
        transactionId: paymentResult.transactionId,
        verified: true
      });
    }
    
    await membership.save();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: paymentResult.transactionId,
        amount: amount / 100,
        status: 'completed',
        customerId: squareCustomerId
      },
      membership: {
        playerId: membership.playerId,
        status: membership.status,
        amount: membership.amount,
        startDate: membership.startDate
      }
    });

  } catch (error) {
    console.error('Square membership payment error:', error);
    res.status(500).json({
      error: 'Failed to process payment',
      message: error.message
    });
  }
});

/**
 * Create Square payment link for membership
 * POST /api/monetization/square/create-membership-link
 */
router.post('/square/create-membership-link', async (req, res) => {
  try {
    const { 
      email, 
      playerName, 
      amount = 500, // $5.00 in cents
      redirectUrl 
    } = req.body;
    
    if (!email || !playerName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and player name are required'
      });
    }

    // Create payment link
    const linkResult = await createSquarePaymentLink({
      amount: amount,
      description: `Ladder Membership - ${playerName}`,
      redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/payment-success?email=${email}`
    });

    if (!linkResult.success) {
      return res.status(500).json({
        error: 'Failed to create payment link',
        message: linkResult.error
      });
    }

    res.json({
      success: true,
      paymentLink: linkResult.paymentLink,
      url: linkResult.url,
      amount: amount / 100
    });

  } catch (error) {
    console.error('Square payment link error:', error);
    res.status(500).json({
      error: 'Failed to create payment link',
      message: error.message
    });
  }
});

/**
 * Verify Square payment webhook
 * POST /api/monetization/square/webhook
 */
router.post('/square/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment.created' || type === 'payment.updated') {
      const payment = data.object;
      
      // Check if this is a membership payment
      if (payment.note && payment.note.includes('Ladder Membership')) {
        const email = payment.note.split(' - ')[1]; // Extract email from note
        
        // Update membership status
        const membership = await Membership.findOne({ playerId: email });
        if (membership) {
          membership.status = 'active';
          membership.lastPaymentDate = new Date();
          membership.squarePaymentId = payment.id;
          
          if (!membership.paymentHistory) {
            membership.paymentHistory = [];
          }
          membership.paymentHistory.push({
            date: new Date(),
            amount: payment.amountMoney.amount / 100,
            method: 'square',
            transactionId: payment.id,
            verified: true
          });
          
          await membership.save();
        }
      }
    }
    
    res.json({ success: true });

  } catch (error) {
    console.error('Square webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

/**
 * Get Square payment status
 * GET /api/monetization/square/payment-status/:paymentId
 */
router.get('/square/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const paymentResult = await getSquarePayment(paymentId);
    
    if (!paymentResult.success) {
      return res.status(404).json({
        error: 'Payment not found',
        message: paymentResult.error
      });
    }

    res.json({
      success: true,
      payment: paymentResult.payment
    });

  } catch (error) {
    console.error('Square payment status error:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error.message
    });
  }
});

// ============================================================================
// PAYMENT INTEGRATION (Square, CashApp, Venmo)
// ============================================================================

/**
 * Get available payment methods for ladder
 * GET /api/monetization/payment-methods
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentConfig = await PaymentConfig.findOne({ leagueId: 'default' });
    
    if (!paymentConfig) {
      return res.status(404).json({
        error: 'Payment configuration not found',
        message: 'Please configure payment methods in the admin dashboard'
      });
    }

    // Filter enabled payment methods
    const enabledMethods = Object.entries(paymentConfig.paymentMethods)
      .filter(([key, method]) => method.enabled)
      .map(([key, method]) => ({
        id: key,
        name: method.displayName,
        instructions: method.instructions,
        username: method.username || '',
        paymentLink: method.paymentLink || '',
        payeeName: method.payeeName || '',
        mailingAddress: method.mailingAddress || ''
      }));

    res.json({
      success: true,
      paymentMethods: enabledMethods,
      contactInfo: paymentConfig.contactInfo,
      additionalInstructions: paymentConfig.additionalInstructions
    });

  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
});

/**
 * Create payment session for membership
 * POST /api/monetization/create-membership-payment
 */
router.post('/create-membership-payment', async (req, res) => {
  try {
    const { email, playerName, paymentMethod, returnUrl, claimData } = req.body;
    
    if (!email || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and payment method are required'
      });
    }

    // Map frontend payment method names to backend enum values
    const paymentMethodMap = {
      'creditCard': 'credit_card',
      'applePay': 'apple_pay',
      'googlePay': 'google_pay'
    };
    
    const backendPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod;

    // Get payment configuration
    const paymentConfig = await PaymentConfig.findOne({ leagueId: 'default' });
    if (!paymentConfig) {
      return res.status(404).json({
        error: 'Payment configuration not found',
        message: 'Please configure payment methods in the admin dashboard'
      });
    }

    const method = paymentConfig.paymentMethods[paymentMethod];
    if (!method || !method.enabled) {
      return res.status(400).json({
        error: 'Invalid payment method',
        message: 'Selected payment method is not available'
      });
    }

    // Handle Square payments (Credit/Debit cards)
    if ((paymentMethod === 'creditCard' || paymentMethod === 'credit_card') && method.processor === 'square') {
      console.log('🔍 Processing Square payment for:', paymentMethod);
      console.log('Method config:', method);
      console.log('Square environment variables:', {
        SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN ? 'Set' : 'Not set',
        NODE_ENV: process.env.NODE_ENV,
        FRONTEND_URL: process.env.FRONTEND_URL
      });
      
      try {
                 // Create Square payment link for membership
         const paymentLinkResult = await createSquarePaymentLink({
           amount: 500, // $5.00 in cents
           description: `Ladder Membership - ${playerName}`,
           redirectUrl: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?email=${email}&type=membership&claimData=${encodeURIComponent(JSON.stringify(claimData))}`
         });
        
        console.log('Square payment link result:', paymentLinkResult);

        if (!paymentLinkResult.success) {
          throw new Error(paymentLinkResult.error);
        }

        // Store pending claim in database for verification
        if (claimData) {
          const pendingClaim = new PendingClaim({
            email,
            playerName,
            ladder: claimData.ladder,
            position: claimData.position,
            generatedPin: claimData.generatedPin,
            paymentMethod: 'square', // Use 'square' for PendingClaim model
            amount: 5.00,
            status: 'pending_payment',
            createdAt: new Date()
          });
          await pendingClaim.save();
        }

        return res.json({
          success: true,
          paymentType: 'square_redirect',
          paymentUrl: paymentLinkResult.url,
          paymentSession: {
            id: `membership_${Date.now()}`,
            type: 'membership',
            amount: 5.00,
            email,
            playerName,
            paymentMethod: 'square',
            status: 'pending',
            createdAt: new Date()
          }
        });
      } catch (squareError) {
        console.error('Square payment link creation error:', squareError);
        return res.status(500).json({
          error: 'Failed to create Square payment link',
          message: 'Please try again or contact support'
        });
      }
    }

    // Handle manual payment methods (Venmo, CashApp, Cash, etc.)
    const paymentSession = {
      id: `membership_${Date.now()}`,
      type: 'membership',
      amount: 5.00, // $5/month membership
      email,
      playerName,
      paymentMethod,
      instructions: method.instructions,
      username: method.username,
      paymentLink: method.paymentLink,
      payeeName: method.payeeName,
      mailingAddress: method.mailingAddress,
      status: 'pending',
      createdAt: new Date()
    };

    // Store pending claim for manual payment methods
    if (claimData) {
      const pendingClaim = new PendingClaim({
        email,
        playerName,
        ladder: claimData.ladder,
        position: claimData.position,
        generatedPin: claimData.generatedPin,
        paymentMethod: backendPaymentMethod, // Use mapped payment method for PendingClaim
        amount: 5.00,
        status: 'pending_payment',
        createdAt: new Date()
      });
      await pendingClaim.save();
    }

    res.json({
      success: true,
      paymentType: 'manual',
      paymentSession,
      membership: {
        price: 5.00,
        name: 'Ladder Membership'
      }
    });

  } catch (error) {
    console.error('Error creating membership payment:', error);
    res.status(500).json({
      error: 'Failed to create payment session',
      message: error.message
    });
  }
});

/**
 * Create payment session for match fee
 * POST /api/monetization/create-match-fee-payment
 */
router.post('/create-match-fee-payment', async (req, res) => {
  try {
    const { matchId, playerId, amount, paymentMethod, returnUrl } = req.body;
    
    if (!matchId || !playerId || !amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Match ID, player ID, amount, and payment method are required'
      });
    }

    // Get payment configuration
    const paymentConfig = await PaymentConfig.findOne({ leagueId: 'default' });
    if (!paymentConfig) {
      return res.status(404).json({
        error: 'Payment configuration not found',
        message: 'Please configure payment methods in the admin dashboard'
      });
    }

    const method = paymentConfig.paymentMethods[paymentMethod];
    if (!method || !method.enabled) {
      return res.status(400).json({
        error: 'Invalid payment method',
        message: 'Selected payment method is not available'
      });
    }

    // Create payment session
    const paymentSession = {
      id: `match_${Date.now()}`,
      type: 'match_fee',
      amount: parseFloat(amount),
      matchId,
      playerId,
      paymentMethod,
      instructions: method.instructions,
      username: method.username,
      paymentLink: method.paymentLink,
      payeeName: method.payeeName,
      mailingAddress: method.mailingAddress,
      status: 'pending',
      createdAt: new Date()
    };

    res.json({
      success: true,
      paymentSession,
      matchId,
      amount
    });

  } catch (error) {
    console.error('Error creating match fee payment:', error);
    res.status(500).json({
      error: 'Failed to create payment session',
      message: error.message
    });
  }
});

/**
 * Verify payment completion
 * POST /api/monetization/verify-payment
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { paymentSessionId, email, paymentMethod } = req.body;
    
    if (!paymentSessionId || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Payment session ID and email are required'
      });
    }

    // For manual payment verification, we'll create the membership/match fee
    // In a real implementation, you'd verify the payment with your payment processor
    
    // Find or create membership
    let membership = await Membership.findOne({ playerId: email });
    
    if (!membership) {
      // Create new membership
      membership = new Membership({
        playerId: email,
        tier: 'standard',
        status: 'active',
        amount: 5.00,
        startDate: new Date(),
        paymentMethod: paymentMethod
      });
    } else {
      // Update existing membership
      membership.status = 'active';
      membership.lastPaymentDate = new Date();
      membership.paymentMethod = paymentMethod;
    }
    
    await membership.save();

    res.json({
      success: true,
      membership: {
        playerId: membership.playerId,
        tier: membership.tier,
        status: membership.status,
        amount: membership.amount,
        startDate: membership.startDate
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

/**
 * Record manual payment (legacy)
 * POST /api/monetization/record-manual-payment
 */
router.post('/record-manual-payment', async (req, res) => {
  try {
    const { 
      type, 
      email, 
      playerName, 
      amount, 
      paymentMethod, 
      matchId, 
      playerId,
      notes,
      transactionId,
      paymentDate
    } = req.body;
    
    if (!type || !email || !amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Type, email, amount, and payment method are required'
      });
    }

    if (type === 'membership') {
      // Create or update membership
      let membership = await Membership.findOne({ playerId: email });
      
      if (!membership) {
        membership = new Membership({
          playerId: email,
          tier: 'standard',
          status: 'active',
          amount: 5.00,
          startDate: new Date(),
          paymentMethod: paymentMethod,
          lastPaymentDate: paymentDate || new Date(),
          paymentHistory: [{
            date: paymentDate || new Date(),
            amount: amount,
            method: paymentMethod,
            transactionId: transactionId,
            notes: notes,
            verified: true
          }]
        });
      } else {
        membership.status = 'active';
        membership.lastPaymentDate = paymentDate || new Date();
        membership.paymentMethod = paymentMethod;
        
        // Add to payment history
        if (!membership.paymentHistory) {
          membership.paymentHistory = [];
        }
        membership.paymentHistory.push({
          date: paymentDate || new Date(),
          amount: amount,
          method: paymentMethod,
          transactionId: transactionId,
          notes: notes,
          verified: true
        });
      }
      
      await membership.save();
      
      console.log(`Membership payment recorded for ${email} via ${paymentMethod}`);
      
      res.json({
        success: true,
        message: 'Membership payment recorded successfully',
        membership: {
          playerId: membership.playerId,
          tier: membership.tier,
          status: membership.status,
          amount: membership.amount,
          startDate: membership.startDate,
          lastPaymentDate: membership.lastPaymentDate
        }
      });
    } else if (type === 'match_fee') {
      // Record match fee payment
      const match = await LadderMatch.findById(matchId);
      if (!match) {
        return res.status(404).json({
          error: 'Match not found',
          message: 'Match ID is invalid'
        });
      }
      
      // Update match with payment info
      match.paymentStatus = 'paid';
      match.paymentMethod = paymentMethod;
      match.paymentDate = paymentDate || new Date();
      match.paymentNotes = notes;
      match.transactionId = transactionId;
      
      await match.save();
      
      console.log(`Match fee payment recorded for match ${matchId} via ${paymentMethod}`);
      
      res.json({
        success: true,
        message: 'Match fee payment recorded successfully',
        match: {
          id: match._id,
          paymentStatus: match.paymentStatus,
          paymentMethod: match.paymentMethod,
          paymentDate: match.paymentDate
        }
      });
    } else {
      return res.status(400).json({
        error: 'Invalid payment type',
        message: 'Payment type must be "membership" or "match_fee"'
      });
    }

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      error: 'Failed to record payment',
      message: error.message
    });
  }
});

/**
 * Get payment status for a player
 * GET /api/monetization/payment-status/:email
 */
router.get('/payment-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    
    // Check for paid membership
    const membership = await Membership.findOne({ playerId: email });
    
    // Check if we're in promotional period
    const isPromotionalPeriod = await PromotionalConfig.isPromotionalPeriod();
    
    
    // If we're in promotional period, grant access to everyone
    if (isPromotionalPeriod) {
      return res.json({
        success: true,
        hasMembership: true,
        status: 'promotional_period',
        isPromotionalPeriod: true,
        membership: {
          tier: 'promotional',
          amount: 0,
          type: 'promotional_free'
        }
      });
    }
    
    // If no promotional period and no paid membership
    if (!membership) {
      return res.json({
        success: true,
        hasMembership: false,
        status: 'no_membership',
        isPromotionalPeriod: false,
        message: 'No active membership found'
      });
    }
    
    // Paid membership exists
    res.json({
      success: true,
      hasMembership: true,
      status: membership.status,
      isPromotionalPeriod: false,
      membership: {
        tier: membership.tier,
        amount: membership.amount,
        startDate: membership.startDate,
        lastPaymentDate: membership.lastPaymentDate,
        paymentMethod: membership.paymentMethod,
        paymentHistory: membership.paymentHistory || []
      }
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error.message
    });
  }
});

/**
 * Admin: Mark payment as verified
 * POST /api/monetization/verify-payment-admin
 */
router.post('/verify-payment-admin', async (req, res) => {
  try {
    const { 
      type, 
      email, 
      paymentId, 
      verified, 
      adminNotes 
    } = req.body;
    
    if (!type || !email || !paymentId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Type, email, and payment ID are required'
      });
    }

    if (type === 'membership') {
      const membership = await Membership.findOne({ playerId: email });
      
      if (!membership) {
        return res.status(404).json({
          error: 'Membership not found',
          message: 'No membership found for this email'
        });
      }
      
      // Update payment history entry
      if (membership.paymentHistory) {
        const paymentEntry = membership.paymentHistory.find(p => p._id.toString() === paymentId);
        if (paymentEntry) {
          paymentEntry.verified = verified;
          paymentEntry.adminNotes = adminNotes;
          paymentEntry.verifiedDate = new Date();
        }
      }
      
      await membership.save();
      
      res.json({
        success: true,
        message: `Payment ${verified ? 'verified' : 'unverified'} successfully`,
        membership: {
          playerId: membership.playerId,
          status: membership.status,
          lastPaymentDate: membership.lastPaymentDate
        }
      });
    } else if (type === 'match_fee') {
      const match = await LadderMatch.findById(paymentId);
      
      if (!match) {
        return res.status(404).json({
          error: 'Match not found',
          message: 'Match ID is invalid'
        });
      }
      
      match.paymentVerified = verified;
      match.adminNotes = adminNotes;
      match.verifiedDate = new Date();
      
      await match.save();
      
      res.json({
        success: true,
        message: `Match payment ${verified ? 'verified' : 'unverified'} successfully`,
        match: {
          id: match._id,
          paymentStatus: match.paymentStatus,
          paymentVerified: match.paymentVerified
        }
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

/**
 * Get pending payments for admin review
 * GET /api/monetization/pending-payments
 */
router.get('/pending-payments', async (req, res) => {
  try {
    // Get memberships with pending payments
    const pendingMemberships = await Membership.find({
      status: 'pending',
      'paymentHistory.verified': { $ne: true }
    });
    
    // Get matches with pending payments
    const pendingMatches = await LadderMatch.find({
      paymentStatus: 'pending'
    });
    
    res.json({
      success: true,
      pendingMemberships: pendingMemberships.map(m => ({
        email: m.playerId,
        tier: m.tier,
        amount: m.amount,
        paymentMethod: m.paymentMethod,
        lastPaymentDate: m.lastPaymentDate,
        paymentHistory: m.paymentHistory
      })),
      pendingMatches: pendingMatches.map(m => ({
        id: m._id,
        challenger: m.challenger,
        defender: m.defender,
        amount: m.entryFee,
        paymentMethod: m.paymentMethod,
        matchDate: m.matchDate
      }))
    });

  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({
      error: 'Failed to get pending payments',
      message: error.message
    });
  }
});

// ============================================================================
// MEMBERSHIP MANAGEMENT
// ============================================================================

/**
 * Get membership pricing
 * GET /api/monetization/tiers
 */
router.get('/tiers', (req, res) => {
  const membership = {
    name: 'Ladder Membership',
    price: 5.00,
    features: [
      'Access to ladder challenges',
      'Match reporting',
      'Player statistics',
      'Challenge other players',
      'Track your progress'
    ]
  };
  
  res.json({
    success: true,
    membership,
    currency: 'USD'
  });
});

/**
 * Create or update membership
 * POST /api/monetization/membership
 */
router.post('/membership', async (req, res) => {
  try {
    const { playerId, paymentMethod, status = 'active' } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Player ID is required'
      });
    }
    
    // Check if player exists
    const player = await LadderPlayer.findById(playerId);
    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist'
      });
    }
    
    // Check if membership already exists
    let membership = await Membership.findOne({ playerId });
    
    if (membership) {
      // Update existing membership
      membership.tier = 'standard';
      membership.status = status;
      membership.paymentMethod = paymentMethod;
      membership.nextBillingDate = new Date();
      membership.nextBillingDate.setMonth(membership.nextBillingDate.getMonth() + 1);
    } else {
      // Create new membership
      membership = new Membership({
        playerId,
        tier: 'standard',
        status: status,
        paymentMethod: paymentMethod,
        nextBillingDate: new Date()
      });
      membership.nextBillingDate.setMonth(membership.nextBillingDate.getMonth() + 1);
    }
    
    await membership.save();
    
    res.json({
      success: true,
      message: 'Membership created successfully',
      membership
    });
    
  } catch (error) {
    console.error('Error creating membership:', error);
    res.status(500).json({
      error: 'Failed to create membership',
      message: error.message
    });
  }
});

/**
 * Get player membership status
 * GET /api/monetization/membership/:playerId
 */
router.get('/membership/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const membership = await Membership.findOne({ playerId }).populate('playerId');
    
    if (!membership) {
      return res.json({
        success: true,
        hasMembership: false,
        membership: null
      });
    }
    
    res.json({
      success: true,
      hasMembership: true,
      membership,
      isActive: membership.isActive()
    });
    
  } catch (error) {
    console.error('Error getting membership:', error);
    res.status(500).json({
      error: 'Failed to get membership',
      message: error.message
    });
  }
});

/**
 * Cancel membership
 * POST /api/monetization/membership/:playerId/cancel
 */
router.post('/membership/:playerId/cancel', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { reason } = req.body;
    
    const membership = await Membership.findOne({ playerId });
    
    if (!membership) {
      return res.status(404).json({
        error: 'Membership not found',
        message: 'No membership found for this player'
      });
    }
    
    await membership.cancelMembership(reason);
    
    res.json({
      success: true,
      message: 'Membership cancelled successfully',
      membership
    });
    
  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({
      error: 'Failed to cancel membership',
      message: error.message
    });
  }
});

// ============================================================================
// MATCH FEE PROCESSING
// ============================================================================

/**
 * Process match fee payment
 * POST /api/monetization/match-fee
 */
router.post('/match-fee', async (req, res) => {
  try {
    const { matchId, playerId, amount, paymentMethod } = req.body;
    
    if (!matchId || !playerId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Match ID, player ID, and amount are required'
      });
    }
    
    // Check if player has active membership
    const membership = await Membership.findOne({ playerId });
    if (!membership || !membership.isActive()) {
      return res.status(403).json({
        error: 'Membership required',
        message: 'Active membership is required to report matches'
      });
    }
    
    // Get promotional configuration
    const PromotionalConfig = (await import('../models/PromotionalConfig.js')).default;
    const currentPricing = await PromotionalConfig.getCurrentPricing();
    const shouldContributeToPrizePool = await PromotionalConfig.shouldContributeToPrizePool();
    
    // Get current prize pool (only if we should contribute to it)
    let prizePool = null;
    if (shouldContributeToPrizePool) {
      prizePool = await PrizePool.getCurrentPrizePool();
      
      if (!prizePool) {
        // Create new prize pool if none exists
        prizePool = await PrizePool.createNewPeriod('quarterly');
        await prizePool.save();
      }
    }
    
    // Get player info
    const player = await LadderPlayer.findById(playerId);
    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist'
      });
    }
    
    // Calculate fee distribution based on current pricing
    const prizePoolContribution = shouldContributeToPrizePool ? currentPricing.prizePoolContribution : 0;
    const platformRevenue = currentPricing.platformRevenue;
    
    // Add to prize pool (only if we should contribute)
    if (shouldContributeToPrizePool && prizePoolContribution > 0) {
      await prizePool.addMatchContribution({
        matchId,
        amount: prizePoolContribution,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`
      });
    }
    
    // Record payment in membership
    await membership.addPayment({
      amount,
      status: 'completed',
      paymentMethod: paymentMethod,
      description: `Match fee for match ${matchId}`
    });
    
    // Get promotional message
    const promotionalMessage = await PromotionalConfig.getPromotionalMessage();
    
    const response = {
      success: true,
      message: 'Match fee processed successfully',
      payment: {
        totalAmount: amount,
        prizePoolContribution,
        platformRevenue,
        matchId,
        playerId
      },
      promotional: {
        isPromotionalPeriod: await PromotionalConfig.isPromotionalPeriod(),
        message: promotionalMessage
      }
    };
    
    // Add prize pool info only if it exists
    if (prizePool) {
      response.prizePool = {
        currentBalance: prizePool.currentBalance,
        periodName: prizePool.periodName
      };
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error processing match fee:', error);
    res.status(500).json({
      error: 'Failed to process match fee',
      message: error.message
    });
  }
});

// ============================================================================
// PROMOTIONAL CONFIGURATION
// ============================================================================

/**
 * Get current promotional configuration
 * GET /api/monetization/promotional-config
 */
router.get('/promotional-config', async (req, res) => {
  try {
    const PromotionalConfig = (await import('../models/PromotionalConfig.js')).default;
    
    const config = await PromotionalConfig.getCurrentConfig();
    const isPromotional = await PromotionalConfig.isPromotionalPeriod();
    const currentPricing = await PromotionalConfig.getCurrentPricing();
    const shouldContributeToPrizePool = await PromotionalConfig.shouldContributeToPrizePool();
    const promotionalMessage = await PromotionalConfig.getPromotionalMessage();
    
    res.json({
      success: true,
      config: {
        isPromotionalPeriod: isPromotional,
        promotionalStartDate: config.promotionalStartDate,
        promotionalEndDate: config.promotionalEndDate,
        prizePoolStartDate: config.prizePoolStartDate,
        currentPricing,
        shouldContributeToPrizePool,
        promotionalMessage,
        daysUntilPromotionEnds: config.getDaysUntilPromotionEnds(),
        daysUntilPrizePoolStarts: config.getDaysUntilPrizePoolStarts()
      }
    });
    
  } catch (error) {
    console.error('Error fetching promotional config:', error);
    res.status(500).json({
      error: 'Failed to fetch promotional configuration',
      message: error.message
    });
  }
});

// ============================================================================
// PRIZE POOL MANAGEMENT
// ============================================================================

/**
 * Get current prize pool status
 * GET /api/monetization/prize-pool/current
 */
router.get('/prize-pool/current', async (req, res) => {
  try {
    let prizePool = await PrizePool.getCurrentPrizePool();
    
    if (!prizePool) {
      // Create new prize pool if none exists
      prizePool = await PrizePool.createNewPeriod('quarterly');
      await prizePool.save();
    }
    
    res.json({
      success: true,
      prizePool
    });
    
  } catch (error) {
    console.error('Error getting prize pool:', error);
    res.status(500).json({
      error: 'Failed to get prize pool',
      message: error.message
    });
  }
});

/**
 * Get all prize pools
 * GET /api/monetization/prize-pool
 */
router.get('/prize-pool', async (req, res) => {
  try {
    const prizePools = await PrizePool.find().sort({ periodStart: -1 });
    
    res.json({
      success: true,
      prizePools
    });
    
  } catch (error) {
    console.error('Error getting prize pools:', error);
    res.status(500).json({
      error: 'Failed to get prize pools',
      message: error.message
    });
  }
});

/**
 * Calculate winners for current prize pool
 * POST /api/monetization/prize-pool/calculate-winners
 */
router.post('/prize-pool/calculate-winners', async (req, res) => {
  try {
    const prizePool = await PrizePool.getCurrentPrizePool();
    
    if (!prizePool) {
      return res.status(404).json({
        error: 'No active prize pool',
        message: 'No active prize pool found'
      });
    }
    
    await prizePool.calculateWinners();
    
    res.json({
      success: true,
      message: 'Winners calculated successfully',
      prizePool
    });
    
  } catch (error) {
    console.error('Error calculating winners:', error);
    res.status(500).json({
      error: 'Failed to calculate winners',
      message: error.message
    });
  }
});

/**
 * Distribute prizes
 * POST /api/monetization/prize-pool/distribute
 */
router.post('/prize-pool/distribute', async (req, res) => {
  try {
    const { distributedBy } = req.body;
    
    const prizePool = await PrizePool.findOne({ status: 'calculating' });
    
    if (!prizePool) {
      return res.status(404).json({
        error: 'No prize pool ready for distribution',
        message: 'No prize pool in calculating status found'
      });
    }
    
    await prizePool.distributePrizes(distributedBy);
    
    res.json({
      success: true,
      message: 'Prizes distributed successfully',
      prizePool
    });
    
  } catch (error) {
    console.error('Error distributing prizes:', error);
    res.status(500).json({
      error: 'Failed to distribute prizes',
      message: error.message
    });
  }
});

// ============================================================================
// ADMIN STATISTICS
// ============================================================================

/**
 * Get monetization statistics
 * GET /api/monetization/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const [membershipStats, prizePoolStats] = await Promise.all([
      Membership.getMembershipStats(),
      PrizePool.getPrizePoolStats()
    ]);
    
    // Get current active memberships
    const activeMemberships = await Membership.findActiveMemberships();
    
    // Get current prize pool
    const currentPrizePool = await PrizePool.getCurrentPrizePool();
    
    const stats = {
      memberships: {
        total: membershipStats[0]?.count || 0,
        active: activeMemberships.length,
        revenue: membershipStats[0]?.totalRevenue || 0,
        byTier: membershipStats
      },
      prizePools: {
        total: prizePoolStats[0]?.totalCollected || 0,
        distributed: prizePoolStats[0]?.totalDistributed || 0,
        current: currentPrizePool?.currentBalance || 0,
        activePools: prizePoolStats[0]?.activePools || 0
      },
      currentPeriod: currentPrizePool?.periodName || 'No active period'
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error getting monetization stats:', error);
    res.status(500).json({
      error: 'Failed to get monetization stats',
      message: error.message
    });
  }
});

/**
 * Get expiring memberships
 * GET /api/monetization/memberships/expiring
 */
router.get('/memberships/expiring', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const expiringMemberships = await Membership.findExpiringMemberships(parseInt(days));
    
    res.json({
      success: true,
      expiringMemberships,
      days: parseInt(days)
    });
    
  } catch (error) {
    console.error('Error getting expiring memberships:', error);
    res.status(500).json({
      error: 'Failed to get expiring memberships',
      message: error.message
    });
  }
});

// ============================================================================
// SQUARE WEBHOOK HANDLING
// ============================================================================

/**
 * Handle Square payment webhook notifications
 * POST /api/monetization/square/webhook
 */
router.post('/square/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Handle payment completed webhook
    if (type === 'payment.created' || type === 'payment.updated') {
      const payment = data.object;
      
      if (payment.status === 'COMPLETED') {
        // Find pending claim by payment ID or email
        const pendingClaim = await PendingClaim.findOne({
          $or: [
            { 'paymentDetails.transactionId': payment.id },
            { email: payment.receipt_email }
          ],
          status: 'pending_payment'
        });
        
        if (pendingClaim) {
          // Update claim status
          pendingClaim.status = 'payment_verified';
          pendingClaim.paymentDetails = {
            transactionId: payment.id,
            paymentDate: new Date(),
            verifiedBy: 'square_webhook',
            verificationNotes: 'Payment verified via Square webhook'
          };
          await pendingClaim.save();
          
          // Create or update membership
          let membership = await Membership.findOne({ playerId: pendingClaim.email });
          
          if (!membership) {
            membership = new Membership({
              playerId: pendingClaim.email,
              tier: 'standard',
              status: 'active',
              amount: pendingClaim.amount,
              startDate: new Date(),
              paymentMethod: 'square',
              squarePaymentId: payment.id
            });
          } else {
            membership.status = 'active';
            membership.lastPaymentDate = new Date();
            membership.paymentMethod = 'square';
            membership.squarePaymentId = payment.id;
          }
          
          await membership.save();
          
          console.log(`Payment verified and membership created for ${pendingClaim.email}`);
        }
      }
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Square webhook error:', error);
    // Still return 200 to prevent Square from retrying
    res.status(200).json({ received: true, error: error.message });
  }
});

// ============================================================================
// PAYMENT STATUS CHECKING
// ============================================================================

/**
 * Check payment status for a user
 * POST /api/monetization/check-payment-status
 */
router.post('/check-payment-status', async (req, res) => {
  try {
    const { email, claimData } = req.body;
    
    console.log('🔍 Checking payment status for:', email);
    console.log('📋 Claim data:', claimData);
    
    if (!email || !claimData) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and claim data are required'
      });
    }
    
    // Check if there's a pending claim for this user and position
    const pendingClaim = await PendingClaim.findOne({
      email: email,
      ladder: claimData.ladder,
      position: claimData.position,
      status: 'pending_payment'
    });
    
    if (!pendingClaim) {
      console.log('❌ No pending claim found');
      return res.json({
        success: false,
        paymentStatus: 'not_found',
        message: 'No pending claim found for this position'
      });
    }
    
    // For Square payments, we need to check the actual payment status
    // Since this is sandbox testing, we'll simulate a successful payment
    // In production, you'd verify with Square's API
    
    console.log('✅ Found pending claim, simulating successful payment');
    
    // Update the claim status to completed
    pendingClaim.status = 'payment_completed';
    pendingClaim.paymentCompletedAt = new Date();
    await pendingClaim.save();
    
    // In a real implementation, you'd also:
    // 1. Verify the payment with Square's API
    // 2. Update the ladder position status
    // 3. Send confirmation emails
    // 4. Update user permissions
    
    return res.json({
      success: true,
      paymentStatus: 'completed',
      message: 'Payment verified successfully',
      claimData: {
        ladder: pendingClaim.ladder,
        position: pendingClaim.position,
        email: pendingClaim.email,
        playerName: pendingClaim.playerName
      }
    });
    
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      error: 'Failed to check payment status',
      message: 'Please try again or contact support'
    });
  }
});

// ============================================================================
// HYBRID PAYMENT VERIFICATION SYSTEM
// ============================================================================

/**
 * Get user payment data (history, credits, trust level)
 * GET /api/monetization/user-payment-data/:email
 */
router.get('/user-payment-data/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Get user credits
    let userCredits = await UserCredits.findOne({ playerEmail: email });
    if (!userCredits) {
      userCredits = new UserCredits({
        playerEmail: email,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0
      });
      await userCredits.save();
    }
    
    // Get payment history
    const paymentHistory = await PaymentRecord.find({ 
      playerEmail: email,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(50);
    
    // Calculate trust level
    const totalPayments = paymentHistory.length;
    const failedPayments = await PaymentRecord.countDocuments({ 
      playerEmail: email,
      status: 'failed'
    });
    const successRate = totalPayments > 0 ? (totalPayments - failedPayments) / totalPayments : 0;
    
    let trustLevel = 'new';
    if (totalPayments >= 10 && successRate >= 0.95) {
      trustLevel = 'trusted';
    } else if (totalPayments >= 3 && successRate >= 0.8) {
      trustLevel = 'verified';
    }
    
    res.json({
      success: true,
      credits: userCredits.balance,
      paymentHistory: {
        totalPayments,
        failedPayments,
        successRate,
        trustLevel,
        recentPayments: paymentHistory.slice(0, 10)
      }
    });
    
  } catch (error) {
    console.error('Error getting user payment data:', error);
    res.status(500).json({
      error: 'Failed to get user payment data',
      message: error.message
    });
  }
});

/**
 * Use credits for payment
 * POST /api/monetization/use-credits
 */
router.post('/use-credits', async (req, res) => {
  try {
    const { playerEmail, amount, description } = req.body;
    
    if (!playerEmail || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Player email and amount are required'
      });
    }
    
    // Get user credits
    let userCredits = await UserCredits.findOne({ playerEmail });
    if (!userCredits) {
      return res.status(400).json({
        error: 'Insufficient credits',
        message: 'No credits available for this user'
      });
    }
    
    if (userCredits.balance < amount) {
      return res.status(400).json({
        error: 'Insufficient credits',
        message: `You have $${userCredits.balance.toFixed(2)} credits, but need $${amount.toFixed(2)}`
      });
    }
    
    // Deduct credits
    userCredits.balance -= amount;
    userCredits.totalUsed += amount;
    await userCredits.save();
    
    // Record the credit usage as a payment
    const paymentRecord = new PaymentRecord({
      playerEmail,
      amount,
      paymentMethod: 'credits',
      description,
      type: 'match_fee',
      status: 'completed',
      verifiedBy: 'system',
      verificationNotes: 'Paid with credits - no verification needed'
    });
    await paymentRecord.save();
    
    res.json({
      success: true,
      message: 'Credits used successfully',
      remainingCredits: userCredits.balance
    });
    
  } catch (error) {
    console.error('Error using credits:', error);
    res.status(500).json({
      error: 'Failed to use credits',
      message: error.message
    });
  }
});

/**
 * Record payment with verification requirement (main endpoint)
 * POST /api/monetization/record-payment
 */
router.post('/record-payment', async (req, res) => {
  try {
    const { 
      playerEmail, 
      amount, 
      paymentMethod, 
      description, 
      type, 
      requiresVerification = false,
      matchId,
      notes
    } = req.body;
    
    if (!playerEmail || !amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Player email, amount, and payment method are required'
      });
    }
    
    // Determine if verification is required
    const paymentHistory = await PaymentRecord.find({ 
      playerEmail,
      status: 'completed'
    });
    
    const totalPayments = paymentHistory.length;
    const failedPayments = await PaymentRecord.countDocuments({ 
      playerEmail,
      status: 'failed'
    });
    const successRate = totalPayments > 0 ? (totalPayments - failedPayments) / totalPayments : 0;
    
    let trustLevel = 'new';
    if (totalPayments >= 10 && successRate >= 0.95) {
      trustLevel = 'trusted';
    } else if (totalPayments >= 3 && successRate >= 0.8) {
      trustLevel = 'verified';
    }
    
    const needsVerification = requiresVerification || trustLevel === 'new';
    
    // Create payment record
    const paymentRecord = new PaymentRecord({
      playerEmail,
      amount,
      paymentMethod,
      description,
      type,
      status: needsVerification ? 'pending_verification' : 'completed',
      requiresVerification: needsVerification,
      verifiedBy: needsVerification ? null : 'system',
      verificationNotes: needsVerification ? 'Pending admin verification' : 'Auto-approved for trusted user',
      matchId,
      notes
    });
    
    await paymentRecord.save();
    
    // If it's a membership payment and doesn't need verification, create/update membership
    if (type === 'membership' && !needsVerification) {
      let membership = await Membership.findOne({ playerId: playerEmail });
      
      if (!membership) {
        membership = new Membership({
          playerId: playerEmail,
          tier: 'standard',
          status: 'active',
          amount: amount,
          startDate: new Date(),
          paymentMethod: paymentMethod
        });
      } else {
        membership.status = 'active';
        membership.lastPaymentDate = new Date();
        membership.paymentMethod = paymentMethod;
      }
      
      await membership.save();
    }
    
    res.json({
      success: true,
      message: needsVerification ? 'Payment recorded - pending admin verification' : 'Payment recorded successfully',
      paymentId: paymentRecord._id,
      requiresVerification: needsVerification,
      trustLevel
    });
    
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      error: 'Failed to record payment',
      message: error.message
    });
  }
});

/**
 * Purchase credits
 * POST /api/monetization/purchase-credits
 */
router.post('/purchase-credits', async (req, res) => {
  try {
    const { playerEmail, amount, paymentMethod, paymentData } = req.body;
    
    if (!playerEmail || !amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Player email, amount, and payment method are required'
      });
    }
    
    // For now, we'll simulate the payment and add credits
    // In a real implementation, you'd integrate with payment processors here
    
    let userCredits = await UserCredits.findOne({ playerEmail });
    if (!userCredits) {
      userCredits = new UserCredits({
        playerEmail,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0
      });
    }
    
    // Add credits
    userCredits.balance += amount;
    userCredits.totalPurchased += amount;
    await userCredits.save();
    
    // Record the purchase
    const paymentRecord = new PaymentRecord({
      playerEmail,
      amount,
      paymentMethod,
      description: `Credits purchase - $${amount}`,
      type: 'credits_purchase',
      status: 'completed',
      verifiedBy: 'system',
      verificationNotes: 'Credits purchase - no verification needed'
    });
    await paymentRecord.save();
    
    res.json({
      success: true,
      message: 'Credits purchased successfully',
      newBalance: userCredits.balance
    });
    
  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({
      error: 'Failed to purchase credits',
      message: error.message
    });
  }
});

/**
 * Admin: Verify pending payments
 * POST /api/monetization/verify-payment/:paymentId
 */
router.post('/verify-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { verified, adminNotes } = req.body;
    
    const paymentRecord = await PaymentRecord.findById(paymentId);
    if (!paymentRecord) {
      return res.status(404).json({
        error: 'Payment not found',
        message: 'Payment record does not exist'
      });
    }
    
    if (paymentRecord.status !== 'pending_verification') {
      return res.status(400).json({
        error: 'Invalid payment status',
        message: 'Payment is not pending verification'
      });
    }
    
    // Update payment status
    paymentRecord.status = verified ? 'completed' : 'failed';
    paymentRecord.verifiedBy = 'admin';
    paymentRecord.verificationNotes = adminNotes || (verified ? 'Verified by admin' : 'Rejected by admin');
    paymentRecord.verifiedAt = new Date();
    
    await paymentRecord.save();
    
    // If it's a membership payment and was verified, create/update membership
    if (paymentRecord.type === 'membership' && verified) {
      let membership = await Membership.findOne({ playerId: paymentRecord.playerEmail });
      
      if (!membership) {
        membership = new Membership({
          playerId: paymentRecord.playerEmail,
          tier: 'standard',
          status: 'active',
          amount: paymentRecord.amount,
          startDate: new Date(),
          paymentMethod: paymentRecord.paymentMethod
        });
      } else {
        membership.status = 'active';
        membership.lastPaymentDate = new Date();
        membership.paymentMethod = paymentRecord.paymentMethod;
      }
      
      await membership.save();
    }
    
    res.json({
      success: true,
      message: verified ? 'Payment verified successfully' : 'Payment rejected',
      payment: paymentRecord
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

/**
 * Admin: Get pending payments for verification
 * GET /api/monetization/pending-payments
 */
router.get('/pending-payments', async (req, res) => {
  try {
    const pendingPayments = await PaymentRecord.find({ 
      status: 'pending_verification' 
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      pendingPayments
    });
    
  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({
      error: 'Failed to get pending payments',
      message: error.message
    });
  }
});

export default router;
