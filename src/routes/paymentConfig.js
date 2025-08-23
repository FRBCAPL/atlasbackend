import express from 'express';
import PaymentConfig from '../models/PaymentConfig.js';

const router = express.Router();

// Test route to verify the file is loaded
router.get('/test', (req, res) => {
  res.json({ message: 'Payment config routes are working!' });
});

// Get payment configuration
router.get('/', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ leagueId: 'default' });
    
    // Create default config if none exists
    if (!config) {
      config = new PaymentConfig({
        leagueId: 'default',
        registrationFee: 30,
        weeklyDues: 10,
        totalWeeks: 10,
        participationFee: 100,
        phase1Weeks: 6,
        penaltyStructure: {
          strike1: 5,
          strike2: 10,
          strike3: 0
        },
        paymentMethods: {
          cash: {
            enabled: true,
            displayName: 'Cash',
            instructions: 'Pay in person to league administrator'
          }
        }
      });
      await config.save();
    }
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment configuration'
    });
  }
});

// Update payment configuration
router.put('/', async (req, res) => {
  try {
    const {
      registrationFee,
      weeklyDues,
      totalWeeks,
      participationFee,
      phase1Weeks,
      penaltyStructure,
      paymentMethods,
      additionalInstructions,
      contactInfo,
      currentSession
    } = req.body;
    
    let config = await PaymentConfig.findOne({ leagueId: 'default' });
    
    if (!config) {
      config = new PaymentConfig({ leagueId: 'default' });
    }
    
    // Update fields
    if (registrationFee !== undefined) config.registrationFee = registrationFee;
    if (weeklyDues !== undefined) config.weeklyDues = weeklyDues;
    if (totalWeeks !== undefined) config.totalWeeks = totalWeeks;
    if (participationFee !== undefined) config.participationFee = participationFee;
    if (phase1Weeks !== undefined) config.phase1Weeks = phase1Weeks;
    if (penaltyStructure) config.penaltyStructure = penaltyStructure;
    if (paymentMethods) config.paymentMethods = paymentMethods;
    if (additionalInstructions !== undefined) config.additionalInstructions = additionalInstructions;
    if (contactInfo) config.contactInfo = contactInfo;
    if (currentSession) config.currentSession = currentSession;
    
    await config.save();
    
    res.json({
      success: true,
      config,
      message: 'Payment configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment configuration'
    });
  }
});

// Get enabled payment methods only
router.get('/enabled-methods', async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({ leagueId: 'default' });
    
    if (!config) {
      // Return default cash option
      return res.json({
        success: true,
        enabledMethods: [{
          key: 'cash',
          displayName: 'Cash',
          instructions: 'Pay in person to league administrator'
        }],
        registrationFee: 30,
        weeklyDues: 10,
        totalWeeks: 10,
        participationFee: 100,
        phase1Weeks: 6,
        penaltyStructure: {
          strike1: 5,
          strike2: 10,
          strike3: 0
        }
      });
    }
    
    const enabledMethods = Object.entries(config.paymentMethods)
      .filter(([key, method]) => method.enabled)
      .map(([key, method]) => ({
        key,
        displayName: method.displayName,
        instructions: method.instructions,
        username: method.username,
        email: method.email,
        paymentLink: method.paymentLink,
        payeeName: method.payeeName
      }));
    
    res.json({
      success: true,
      enabledMethods,
      registrationFee: config.registrationFee,
      weeklyDues: config.weeklyDues,
      totalWeeks: config.totalWeeks,
      participationFee: config.participationFee,
      phase1Weeks: config.phase1Weeks,
      penaltyStructure: config.penaltyStructure,
      additionalInstructions: config.additionalInstructions,
      contactInfo: config.contactInfo
    });
  } catch (error) {
    console.error('Error fetching enabled payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods'
    });
  }
});

export default router;
