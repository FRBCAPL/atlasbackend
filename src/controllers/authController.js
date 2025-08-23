import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or PIN

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or PIN is required'
      });
    }

    // Try to find user by email first (case-insensitive)
    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    // If not found by email, try to find by PIN
    if (!user) {
      // Find all users and check their PINs (since PINs are hashed)
      const allUsers = await User.find({});
      
      for (const potentialUser of allUsers) {
        try {
          const isPinMatch = await potentialUser.comparePin(identifier);
          if (isPinMatch) {
            user = potentialUser;
            break;
          }
        } catch (error) {
          // Continue checking other users
          continue;
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with that email or PIN'
      });
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Your account is pending approval. Please contact an administrator.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without sensitive information)
    res.json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        pin: identifier, // Return the original PIN for compatibility
        division: user.division,
        divisions: user.divisions,
        isAdmin: user.isAdmin,
        phone: user.phone,
        locations: user.locations,
        availability: user.availability
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
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

    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValidPin = await user.comparePin(pin);

    res.json({
      success: true,
      isValid: isValidPin
    });

  } catch (error) {
    console.error('PIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during PIN validation'
    });
  }
};
