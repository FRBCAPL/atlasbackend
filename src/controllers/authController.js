import UnifiedUser from '../models/UnifiedUser.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderProfile from '../models/LadderProfile.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { identifier } = req.body;

    // Find user by email or PIN
    const user = await UnifiedUser.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { pin: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isApproved) {
      return res.status(401).json({ success: false, message: 'Account not approved' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    // Get user profiles
    const [leagueProfile, ladderProfile] = await Promise.all([
      LeagueProfile.findOne({ userId: user._id }),
      LadderProfile.findOne({ userId: user._id })
    ]);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ Login successful for ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        isActive: user.isActive,
        leagueProfile,
        ladderProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const validatePin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Email and PIN are required'
      });
    }

    const user = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is approved and active
    if (!user.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Your account is pending approval. Please contact an administrator.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Validate PIN
    let isValidPin = false;
    if (user.pin) {
      if (user.pin.startsWith('$2a$')) {
        // Hashed PIN
        isValidPin = await bcrypt.compare(pin, user.pin);
      } else {
        // Plain text PIN
        isValidPin = user.pin === pin;
      }
    }

    res.json({
      success: true,
      isValid: isValidPin,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        isPlatformAdmin: user.isPlatformAdmin,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ PIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during PIN validation'
    });
  }
};

// Account claiming functions for ladder players (keep for backward compatibility)
export const searchLadderPlayer = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists in unified system
    const unifiedUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (unifiedUser) {
      const ladderProfile = await LadderProfile.findOne({ userId: unifiedUser._id });
      
      return res.json({
        success: true,
        found: true,
        user: {
          id: unifiedUser._id,
          firstName: unifiedUser.firstName,
          lastName: unifiedUser.lastName,
          email: unifiedUser.email,
          hasLadderProfile: !!ladderProfile
        },
        message: 'User found in unified system'
      });
    }

    res.json({
      success: true,
      found: false,
      message: 'User not found in unified system'
    });

  } catch (error) {
    console.error('❌ Search ladder player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error searching for player'
    });
  }
};

export const submitAccountClaim = async (req, res) => {
  try {
    const { email, firstName, lastName, phone, claimMessage } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, and last name are required'
      });
    }

    // Check if user already exists in unified system
    const existingUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists in unified system'
      });
    }

    // Create new unified user for claim
    const newUser = new UnifiedUser({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      isPendingApproval: true,
      isApproved: false,
      isActive: false,
      role: 'player',
      claimMessage,
      registrationDate: new Date()
    });

    await newUser.save();

    console.log(`✅ Account claim submitted for: ${firstName} ${lastName} (${email})`);

    res.json({
      success: true,
      message: 'Account claim submitted successfully. Please wait for admin approval.'
    });

  } catch (error) {
    console.error('❌ Submit account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error submitting claim'
    });
  }
};

export const getPendingClaims = async (req, res) => {
  try {
    const pendingUsers = await UnifiedUser.find({ 
      isPendingApproval: true,
      isApproved: false
    }).sort({ registrationDate: 1 });

    res.json({
      success: true,
      claims: pendingUsers.map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        claimMessage: user.claimMessage,
        registrationDate: user.registrationDate
      }))
    });

  } catch (error) {
    console.error('❌ Get pending claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting pending claims'
    });
  }
};

export const approveAccountClaim = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UnifiedUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isPendingApproval = false;
    user.isApproved = true;
    user.isActive = true;
    user.approvalDate = new Date();
    user.approvedBy = req.body.approvedBy || 'admin';

    await user.save();

    console.log(`✅ Account claim approved for: ${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'Account claim approved successfully'
    });

  } catch (error) {
    console.error('❌ Approve account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error approving claim'
    });
  }
};

export const rejectAccountClaim = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await UnifiedUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await UnifiedUser.findByIdAndDelete(userId);

    console.log(`❌ Account claim rejected for: ${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'Account claim rejected successfully'
    });

  } catch (error) {
    console.error('❌ Reject account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error rejecting claim'
    });
  }
};
