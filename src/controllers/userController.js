import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import syncSheetUsersToMongo from '../utils/syncUsersFromSheet.js';
import bcrypt from 'bcryptjs';
import LadderPlayer from '../models/LadderPlayer.js';

export const getAllUsers = async (req, res) => {
  try {
    // Fetch all league players
    const leaguePlayers = await User.find({}).lean();
    
    // Fetch all ladder players
    const ladderPlayers = await LadderPlayer.find({}).lean();
    
    // Create maps to track players by email and by name
    const playerMapByEmail = new Map();
    const playerMapByName = new Map();
    
         // Add league players
     leaguePlayers.forEach(player => {
      
      const playerData = {
        ...player,
        system: 'league',
        isLeaguePlayer: true,
        isLadderPlayer: false
      };
      
      // Store by email if available
      if (player.email) {
        playerMapByEmail.set(player.email, playerData);
      }
      
      // Store by name for matching players without emails
      const nameKey = `${player.firstName?.toLowerCase()}-${player.lastName?.toLowerCase()}`;
      playerMapByName.set(nameKey, playerData);
    });
    
              // Add ladder players and check for duplicates
     ladderPlayers.forEach(player => {
       
       const nameKey = `${player.firstName?.toLowerCase()}-${player.lastName?.toLowerCase()}`;
       const ladderInfo = {
         ladderName: player.ladderName,
         position: player.position,
         fargoRate: player.fargoRate,
         isActive: player.isActive
       };
       
               // Check if player has a valid email (not undefined, null, or empty)
        const hasValidEmail = player.email && 
                             player.email !== 'undefined' && 
                             player.email !== 'null' && 
                             player.email.trim() !== '';

        // Check if player exists in both systems by email
        if (hasValidEmail && playerMapByEmail.has(player.email)) {
          const existingPlayer = playerMapByEmail.get(player.email);
          playerMapByEmail.set(player.email, {
            ...existingPlayer,
            system: 'both',
            isLeaguePlayer: true,
            isLadderPlayer: true,
            ladderInfo
          });
        }
        // Check if player exists in both systems by name (for players without emails)
        else if (playerMapByName.has(nameKey)) {
          const existingPlayer = playerMapByName.get(nameKey);
          
          // Update the existing player with ladder info
          const updatedPlayer = {
            ...existingPlayer,
            system: 'both',
            isLeaguePlayer: true,
            isLadderPlayer: true,
            ladderInfo
          };
          
          // Update both maps
          if (existingPlayer.email) {
            playerMapByEmail.set(existingPlayer.email, updatedPlayer);
          }
          playerMapByName.set(nameKey, updatedPlayer);
                 } else {
            // Player only in ladder
            const ladderPlayerData = {
              ...player,
              system: 'ladder',
              isLeaguePlayer: false,
              isLadderPlayer: true,
              // For ladder-only players, ladder info is directly on the object
              ladderName: player.ladderName,
              position: player.position,
              fargoRate: player.fargoRate,
              isActive: player.isActive
            };
            
            // Only add to email map if they have a valid email
            if (hasValidEmail) {
              playerMapByEmail.set(player.email, ladderPlayerData);
            }
            playerMapByName.set(nameKey, ladderPlayerData);
          }
     });
    
         // Combine all players from both maps
     const allPlayers = Array.from(playerMapByEmail.values());
     
     // Add players that only exist in the name map (players without emails)
     playerMapByName.forEach((player, nameKey) => {
       if (!player.email || !playerMapByEmail.has(player.email)) {
         allPlayers.push(player);
       }
     });
    
    // Sort players alphabetically by first name
    allPlayers.sort((a, b) => {
      const firstNameA = (a.firstName || '').toLowerCase();
      const firstNameB = (b.firstName || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
    
    res.json(allPlayers);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Search users endpoint
export const searchUsers = async (req, res) => {
  try {
    const { approved, division, search } = req.query;
    
    let query = {};
    
    // Filter by approval status
    if (approved === 'true') {
      query.isApproved = true;
    } else if (approved === 'false') {
      query.isApproved = false;
    }
    
    // Filter by division
    if (division) {
      query.$or = [
        { division: division },
        { divisions: { $in: [division] } }
      ];
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('firstName lastName email phone locations availability preferredContacts division divisions isApproved paymentHistory penalties')
      .lean();
    

    
    res.json({
      success: true,
      users: users
    });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const idOrEmail = decodeURIComponent(req.params.idOrEmail);
    // Try to find by id or email
    const user = await User.findOne({ $or: [ { id: idOrEmail }, { email: idOrEmail } ] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// New registration endpoint
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      textNumber,
      emergencyContactName,
      emergencyContactPhone,
      preferredContacts,
      availability,
      locations,
      pin,
      division,
      notes
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if pending registration already exists
    const existingPending = await PendingRegistration.findOne({ email: email.toLowerCase() });
    if (existingPending) {
      return res.status(400).json({ error: 'Registration already submitted and pending approval' });
    }

    // Create pending registration
    const pendingRegistration = new PendingRegistration({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      textNumber,
      emergencyContactName,
      emergencyContactPhone,
      preferredContacts,
      availability,
      locations,
      pin,
      division,
      notes
    });

    await pendingRegistration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Please wait for admin approval.',
      registrationId: pendingRegistration._id
    });

  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Get pending registrations (admin only)
export const getPendingRegistrations = async (req, res) => {
  try {
    const pendingRegistrations = await PendingRegistration.find({ 
      status: { $in: ['pending', 'payment_pending'] } 
    }).sort({ registrationDate: -1 });
    
    res.json(pendingRegistrations);
  } catch (err) {
    console.error('Error fetching pending registrations:', err);
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
};

// Approve registration (admin only)
export const approveRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { approvedBy, paymentInfo, division } = req.body;

    const pendingRegistration = await PendingRegistration.findById(registrationId);
    if (!pendingRegistration) {
      return res.status(404).json({ error: 'Pending registration not found' });
    }

    if (pendingRegistration.status !== 'pending' && pendingRegistration.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Registration has already been processed' });
    }

    // Update division if provided
    if (division) {
      pendingRegistration.division = division;
    }

    // Approve the registration
    const user = await pendingRegistration.approve(approvedBy, paymentInfo);

    res.json({
      success: true,
      message: 'Registration approved successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        division: user.division,
        isApproved: user.isApproved
      }
    });

  } catch (err) {
    console.error('Error approving registration:', err);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
};

// Reject registration (admin only)
export const rejectRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { rejectedBy, notes } = req.body;

    const pendingRegistration = await PendingRegistration.findById(registrationId);
    if (!pendingRegistration) {
      return res.status(404).json({ error: 'Pending registration not found' });
    }

    if (pendingRegistration.status !== 'pending' && pendingRegistration.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Registration has already been processed' });
    }

    // Reject the registration
    await pendingRegistration.reject(rejectedBy, notes);

    res.json({
      success: true,
      message: 'Registration rejected successfully'
    });

  } catch (err) {
    console.error('Error rejecting registration:', err);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.pin;
    delete updateData.isAdmin;
    delete updateData.isApproved;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        lastProfileUpdate: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isApproved: user.isApproved
      }
    });

  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Verify PIN for login
export const verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    // First check approved users
    let user = await User.findOne({ email: email.toLowerCase(), isApproved: true });
    
    if (user) {
      const isValidPin = await user.comparePin(pin);
      if (isValidPin) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        return res.json({
          success: true,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin,
            isApproved: user.isApproved
          }
        });
      }
    }

    // If not found in approved users, check pending registrations
    const pendingRegistration = await PendingRegistration.findOne({ 
      email: email.toLowerCase(),
      status: { $in: ['pending', 'payment_pending'] }
    });

    if (pendingRegistration) {
      const isValidPin = await bcrypt.compare(pin, pendingRegistration.pin);
      if (isValidPin) {
        return res.status(403).json({ 
          error: 'Registration pending approval. Please contact admin.',
          status: 'pending_approval'
        });
      }
    }

    res.status(401).json({ error: 'Invalid email or PIN' });

  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
};

export const syncUsers = async (req, res) => {
  try {
    await syncSheetUsersToMongo();
    res.json({ success: true, message: 'Users synced successfully' });
  } catch (err) {
    console.error('Error syncing users:', err);
    res.status(500).json({ error: 'Failed to sync users' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { idOrEmail } = req.params;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences object is required' });
    }

    const user = await User.findOneAndUpdate(
      { $or: [ { id: idOrEmail }, { email: idOrEmail } ] },
      { 
        $set: { 
          preferences: {
            ...preferences,
            // Ensure we don't overwrite existing preferences
            googleCalendarIntegration: preferences.googleCalendarIntegration ?? false,
            emailNotifications: preferences.emailNotifications ?? true
          }
        } 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error updating user preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
};

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      pin,
      division,
      locations,
      isApproved,
      isActive
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      pin,
      division,
      locations,
      isApproved: isApproved !== undefined ? isApproved : true,
      isActive: isActive !== undefined ? isActive : true,
      approvalDate: new Date(),
      approvedBy: 'admin'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        pin: newUser.pin
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

// Update existing user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData._id;
    delete updateData.__v;
    delete updateData.pin; // Don't allow PIN updates via this endpoint
    delete updateData.isAdmin; // Don't allow admin status updates via this endpoint

    // First, try to find the user in the User collection
    let user = await User.findById(userId);
    let isLadderPlayer = false;

    // If not found in User collection, check LadderPlayer collection
    if (!user) {
      const ladderPlayer = await LadderPlayer.findById(userId);
      if (ladderPlayer) {
        isLadderPlayer = true;
        user = ladderPlayer;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Player not found in either User or LadderPlayer collections'
        });
      }
    }

    // If updating email, check if it already exists in User collection
    if (updateData.email && updateData.email.trim() !== '') {
      const existingUser = await User.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `Email "${updateData.email}" is already in use by another player`
        });
      }
      
      // Convert email to lowercase
      updateData.email = updateData.email.toLowerCase();
    }

    let updatedUser;
    if (isLadderPlayer) {
      // Update LadderPlayer
      updatedUser = await LadderPlayer.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          lastProfileUpdate: new Date()
        },
        { new: true, runValidators: false }
      );
    } else {
      // Update User
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          lastProfileUpdate: new Date()
        },
        { new: true, runValidators: false } // Disable validation to avoid preferredContacts issues
      );
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.json({
      success: true,
      message: 'Player updated successfully',
      user: {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isApproved: updatedUser.isApproved,
        isActive: updatedUser.isActive,
        divisions: updatedUser.divisions,
        locations: updatedUser.locations,
        notes: updatedUser.notes
      }
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    
    // Provide more specific error messages
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use by another player'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating player'
    });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
}; 