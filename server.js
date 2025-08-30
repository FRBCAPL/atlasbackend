import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StreamChat } from 'stream-chat';
import cron from 'node-cron';
import { exec } from 'child_process';
import { deleteExpiredMatchChannels } from './src/cleanupChannels.js';
import { createMatchEvent } from './src/googleCalendar.js';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import connectDB from './database.js';
import fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import routes
import apiRoutes from './src/routes/index.js';
import Division from './src/models/Division.js';
import unifiedAuthRoutes from './src/routes/unifiedAuth.js';

// Import security middleware
import { 
  rateLimiter, 
  authRateLimiter, 
  proposalRateLimiter, 
  adminRateLimiter,
  requestSizeLimit, 
  sanitizeInput,
  securityHeaders,
  securityLogging,
  ipBlocking,
  validateContentType,
  requestTimeout
} from './src/middleware/security.js';
import { 
  devLogging, 
  prodLogging, 
  errorLogging, 
  requestLogger, 
  errorLogger 
} from './src/middleware/logging.js';
import { 
  basicHealthCheck, 
  detailedHealthCheck, 
  readinessCheck, 
  livenessCheck, 
  metrics 
} from './src/middleware/health.js';
import { 
  errorHandler, 
  notFoundHandler, 
  gracefulShutdown, 
  setupGlobalErrorHandlers 
} from './src/middleware/errorHandler.js';

const allowedOrigins = [
  'https://frusapl.com',
  'https://www.frontrangepool.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://frbcapl.github.io',
  'https://frbcapl.github.io/NEWAPP',
  'https://newapp-1-ic1v.onrender.com',
  'https://frontrangepool.com',
  'http://frontrangepool.com',
  'https://www.frontrangepool.com',
  'http://www.frontrangepool.com',
];

// Create the Express app
const app = express();

async function startServer() {
  await connectDB();

  // CORS setup (allow dev and production frontend origins)
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(helmet());

  // Enhanced security middleware
  app.use(securityHeaders);
  app.use(securityLogging);
  app.use(ipBlocking);
  app.use(validateContentType);
  app.use(requestTimeout(30000)); // 30 second timeout
  app.use(requestSizeLimit);
  app.use(sanitizeInput);
  
  // Rate limiting - apply to all routes
  app.use(rateLimiter);
  
  // Stricter rate limiting for auth endpoints
  app.use('/api/users/check-pin', authRateLimiter);
  app.use('/api/users/:userId/confirm-payment', authRateLimiter);
  
  // Stricter rate limiting for proposal creation
  app.use('/api/proposals', proposalRateLimiter);
  app.use('/api/challenges', proposalRateLimiter);
  
  // Rate limiting for admin endpoints
  app.use('/api/admin', adminRateLimiter);

  // Logging middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(prodLogging);
  } else {
    app.use(devLogging);
  }
  app.use(errorLogging);
  app.use(requestLogger);

  console.log('Serving static files from:', path.join(__dirname, 'public'));
  app.use('/static', express.static(path.join(__dirname, 'public')));
  app.use(express.json({ limit: '1mb' }));

  // Remove any direct mongoose.connect(...) calls from server.js
  // Ensure all MongoDB connections are handled through database.js

  // Stream Chat setup
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  
  console.log('Stream Chat API Key available:', !!apiKey);
  console.log('Stream Chat API Secret available:', !!apiSecret);
  
  if (!apiKey || !apiSecret) {
    console.error('Stream Chat API keys are missing! Please set STREAM_API_KEY and STREAM_API_SECRET environment variables.');
  }
  
  const serverClient = StreamChat.getInstance(apiKey, apiSecret);

  // Admin emails - support multiple league operators
  const ADMIN_EMAILS = [
    "admin@frusapl.com", 
    "admin2@frusapl.com", 
    "frbcaplgmailcom",
    "frbcapl@gmail.com",
    "sslampro@gmail.com"
  ];

  function cleanId(id) {
    return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  }

  function isAdminUser(userId) {
    return ADMIN_EMAILS.includes(userId);
  }

  function getMatchChannelId(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `match-${cleanId(sortedIds[0])}-${cleanId(sortedIds[1])}`;
  }

  // Helper function to ensure all channels exist and add user to them
  async function ensureChannelsExistAndAddUser(userId) {
    const AVAILABLE_DIVISIONS = ["FRBCAPL TEST", "Singles Test"];
    
    // Create or get general channel
    try {
      const generalChannel = serverClient.channel('messaging', 'general', {
        name: "General Chat",
        description: "General discussion for all players"
      });
      try {
        await generalChannel.create();
        console.log('Created general channel');
      } catch (createError) {
        // Channel may already exist
        console.log('General channel may already exist');
      }
      await generalChannel.addMembers([userId]);
      console.log('Added user to general channel:', userId);
    } catch (channelError) {
      console.log('Could not add user to general channel:', channelError.message);
    }
    
    // Create or get announcements channel
    try {
      const announcementsChannel = serverClient.channel('messaging', 'announcements', {
        name: "📢 Announcements",
        description: "Important announcements and updates"
      });
      try {
        await announcementsChannel.create();
        console.log('Created announcements channel');
      } catch (createError) {
        // Channel may already exist
        console.log('Announcements channel may already exist');
      }
      await announcementsChannel.addMembers([userId]);
      console.log('Added user to announcements channel:', userId);
    } catch (channelError) {
      console.log('Could not add user to announcements channel:', channelError.message);
    }
    
    // Create or get division channels
    for (const division of AVAILABLE_DIVISIONS) {
      const divisionId = division.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      try {
        const divisionChannel = serverClient.channel('messaging', `division-${divisionId}`, {
          name: `🏆 ${division}`,
          description: `Discussion for ${division} players`,
          category: 'divisions'
        });
        try {
          await divisionChannel.create();
          console.log(`Created division channel: ${division}`);
        } catch (createError) {
          // Channel may already exist
          console.log(`Division channel ${division} may already exist`);
        }
        await divisionChannel.addMembers([userId]);
        console.log(`Added user to division channel ${division}:`, userId);
      } catch (channelError) {
        console.log(`Could not add user to division channel ${division}:`, channelError.message);
      }
    }
    
    // Create or get game room channels
    for (let i = 1; i <= 5; i++) {
      try {
        const gameRoomChannel = serverClient.channel('messaging', `game-room-${i}`, {
          name: `🎮 Game Room ${i}`,
          description: `Multiplayer game room ${i} - for future online play`,
          category: 'game-rooms'
        });
        try {
          await gameRoomChannel.create();
          console.log(`Created game room ${i}`);
        } catch (createError) {
          // Channel may already exist
          console.log(`Game room ${i} may already exist`);
        }
        await gameRoomChannel.addMembers([userId]);
        console.log(`Added user to game room ${i}:`, userId);
      } catch (channelError) {
        console.log(`Could not add user to game room ${i}:`, channelError.message);
      }
    }
  }

  // Initialize all channels endpoint
  app.post('/init-channels', async (req, res) => {
    try {
      const AVAILABLE_DIVISIONS = ["FRBCAPL TEST", "Singles Test"];
      
      // Create general channel
      try {
        const generalChannel = serverClient.channel('messaging', 'general', {
          name: "General Chat",
          description: "General discussion for all players"
        });
        await generalChannel.create();
        console.log('Created general channel');
      } catch (error) {
        console.log('General channel may already exist:', error.message);
      }
      
      // Create announcements channel
      try {
        const announcementsChannel = serverClient.channel('messaging', 'announcements', {
          name: "📢 Announcements",
          description: "Important announcements and updates"
        });
        await announcementsChannel.create();
        console.log('Created announcements channel');
      } catch (error) {
        console.log('Announcements channel may already exist:', error.message);
      }
      
      // Create division channels
      for (const division of AVAILABLE_DIVISIONS) {
        const divisionId = division.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        try {
          const divisionChannel = serverClient.channel('messaging', `division-${divisionId}`, {
            name: `🏆 ${division}`,
            description: `Discussion for ${division} players`
          });
          await divisionChannel.create();
          console.log(`Created division channel: ${division}`);
        } catch (error) {
          console.log(`Division channel ${division} may already exist:`, error.message);
        }
      }
      
      // Create game room channels
      for (let i = 1; i <= 5; i++) {
        try {
          const gameRoomChannel = serverClient.channel('messaging', `game-room-${i}`, {
            name: `🎮 Game Room ${i}`,
            description: `Multiplayer game room ${i} - for future online play`
          });
          await gameRoomChannel.create();
          console.log(`Created game room ${i}`);
        } catch (error) {
          console.log(`Game room ${i} may already exist:`, error.message);
        }
      }
      
      res.json({ success: true, message: 'All channels initialized' });
    } catch (error) {
      console.error('Error initializing channels:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stream Chat token endpoint
  app.post('/token', async (req, res) => {
    let { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    userId = cleanId(userId);
    
    console.log('Token request for userId:', userId);
    console.log('Admin emails:', ADMIN_EMAILS);
    console.log('Is admin user:', isAdminUser(userId));
    console.log('Stream Chat API Key available:', !!apiKey);
    console.log('Stream Chat API Secret available:', !!apiSecret);
    
    try {
      const user = isAdminUser(userId)
        ? { id: userId, name: "Admin", role: "admin" }
        : { id: userId, name: userId };
      
      console.log('Creating user:', user);
      
      // Try to upsert user, but handle deleted user case
      try {
        await serverClient.upsertUser(user);
        
        // Ensure all channels exist and add user to them
        await ensureChannelsExistAndAddUser(userId);
        
      } catch (upsertError) {
        // If user was deleted, try to create a new user with a different ID
        if (upsertError.message && upsertError.message.includes('was deleted')) {
          console.log('User was deleted, creating new user with timestamp suffix');
          const newUserId = `${userId}_${Date.now()}`;
          const newUser = isAdminUser(userId)
            ? { id: newUserId, name: "Admin", role: "admin" }
            : { id: newUserId, name: userId };
          
                                           await serverClient.upsertUser(newUser);
            
             // Ensure all channels exist and add the new user to them
             await ensureChannelsExistAndAddUser(newUserId);
           
           const token = serverClient.createToken(newUserId);
           console.log('Token generated successfully for new user:', newUserId);
           return res.json({ token, userId: newUserId });
        } else {
          throw upsertError;
        }
      }
      
             const token = serverClient.createToken(userId);
       console.log('Token generated successfully for:', userId);
       res.json({ token, userId: userId });
    } catch (err) {
      console.error('Error generating token:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ error: err.message });
    }
  });

  // Health check endpoints (for Render monitoring)
  app.get('/health', basicHealthCheck);
  app.get('/health/detailed', detailedHealthCheck);
  app.get('/ready', readinessCheck);
  app.get('/live', livenessCheck);
  app.get('/metrics', metrics);

  // API routes
  app.use('/api', apiRoutes);
  
  // Unified authentication routes
  app.use('/api/unified-auth', unifiedAuthRoutes);

  // Error handling middleware (must be last)
  app.use(errorLogger);

  // Admin endpoints
  app.post('/admin/update-standings', (req, res) => {
    // Use the new multi-division scraper
    const cmd = `python scripts/scrape_all_standings.py`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Standings update error:', error);
        return res.status(500).json({ error: stderr || error.message });
      }
      console.log('Standings update output:', stdout);
      res.json({ message: stdout || "All standings updated successfully!" });
    });
  });

  // Use dynamic import for node-fetch (ESM only)
  const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
  app.post('/admin/fetch-standings', async (req, res) => {
    const { standingsUrl } = req.body;
    if (!standingsUrl) {
      return res.status(400).json({ error: 'standingsUrl required' });
    }
    try {
      const response = await fetch(standingsUrl);
      if (!response.ok) throw new Error('Failed to fetch standings');
      const html = await response.text();
      // TODO: Parse the HTML and extract standings as JSON
      // For now, just return the HTML for debugging:
      return res.json({ html });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/admin/update-schedule', async (req, res) => {
    const division = req.body.division;
    const safeDivision = division ? division.replace(/[^A-Za-z0-9]/g, '_') : 'default';
    const filename = `public/schedule_${safeDivision}.json`;
    let cmd = `python scripts/scrape_schedule.py "${division}" "${filename}"`;
    
    try {
      // First, update the schedule
      await new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout || "Schedule updated successfully!");
          }
        });
      });

      // Then, check if Phase 2 deadline needs to be extended
      try {
        const { default: Season } = await import('./src/models/Season.js');
        const season = await Season.getCurrentSeason(division);
        
        if (season) {
          const now = new Date();
          const phase2End = new Date(season.phase2End);
          
          // If Phase 2 deadline has passed, extend it by 4 weeks (28 days)
          if (now > phase2End) {
            const newPhase2End = new Date(now);
            newPhase2End.setDate(newPhase2End.getDate() + 28); // Extend by 4 weeks
            
            season.phase2End = newPhase2End;
            season.seasonEnd = newPhase2End; // Season ends when Phase 2 ends
            await season.save();
            
            console.log(`Automatically extended Phase 2 deadline for ${division} to ${newPhase2End.toISOString()}`);
            
            res.json({ 
              message: `Schedule updated successfully! Phase 2 deadline automatically extended to ${newPhase2End.toLocaleDateString()}.`,
              deadlineExtended: true,
              newDeadline: newPhase2End.toISOString()
            });
          } else {
            res.json({ message: "Schedule updated successfully!" });
          }
        } else {
          res.json({ message: "Schedule updated successfully!" });
        }
      } catch (seasonError) {
        console.error('Error checking/updating season dates:', seasonError);
        res.json({ message: "Schedule updated successfully!" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/admin/update-season-data', async (req, res) => {
    console.log('=== UPDATE SEASON DATA ENDPOINT CALLED ===');
    console.log('Request body:', req.body);
    
    const division = req.body.division;
    console.log('Division:', division);
    
    const safeDivision = division ? division.replace(/[^A-Za-z0-9]/g, '_') : 'default';
    const filename = `public/schedule_${safeDivision}.json`;
    console.log('Filename:', filename);
    
    try {
      // Read the schedule JSON file
      const schedulePath = path.join(__dirname, filename);
      console.log('Schedule path:', schedulePath);
      
      if (!fs.existsSync(schedulePath)) {
        console.log('Schedule file not found!');
        return res.status(404).json({ error: `Schedule file not found for division: ${division}` });
      }
      
      console.log('Schedule file exists, reading...');
      const scheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
      console.log('Schedule data loaded, length:', scheduleData.length);
      
      // Find the last match date (Phase 1 end date)
      let lastMatchDate = null;
      if (scheduleData && scheduleData.length > 0) {
        // Sort matches by date and get the last one
        const sortedMatches = scheduleData.sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log('Sorted matches, last match:', sortedMatches[sortedMatches.length - 1]);
        lastMatchDate = new Date(sortedMatches[sortedMatches.length - 1].date);
        console.log('Last match date:', lastMatchDate);
      }
      
      if (!lastMatchDate) {
        console.log('No valid match dates found!');
        return res.status(400).json({ error: 'No valid match dates found in schedule' });
      }
      
      // Calculate Phase 2 end date (4 weeks after Phase 1 ends)
      const phase2EndDate = new Date(lastMatchDate);
      phase2EndDate.setDate(phase2EndDate.getDate() + 28); // 4 weeks = 28 days
      console.log('Phase 2 end date:', phase2EndDate);
      
      // Update the season data in the database
      console.log('Importing Season model...');
      const { default: Season } = await import('./src/models/Season.js');
      console.log('Season model imported successfully');
      
      console.log('Getting current season...');
      const season = await Season.getCurrentSeason(division);
      console.log('Season found:', season ? 'Yes' : 'No');
      
      if (!season) {
        console.log('No current season found!');
        return res.status(404).json({ error: `No current season found for division: ${division}` });
      }
      
             // Update the season dates
       console.log('Updating season dates...');
       season.phase1End = lastMatchDate;
       season.phase2End = phase2EndDate;
       season.seasonEnd = phase2EndDate; // Season ends when Phase 2 ends
       
       // Ensure required fields are preserved
       if (!season.standingsUrl) {
         season.standingsUrl = `https://frusapl.com/standings/${division.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
       }
       if (!season.scheduleUrl) {
         season.scheduleUrl = `https://frusapl.com/schedule/${division.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
       }
       
       await season.save();
      console.log('Season saved successfully');
      
      console.log(`Updated season data for ${division}:`);
      console.log(`  Phase 1 end: ${lastMatchDate.toISOString()}`);
      console.log(`  Phase 2 end: ${phase2EndDate.toISOString()}`);
      
      res.json({ 
        message: `Season data updated successfully! Phase 1 ends: ${lastMatchDate.toLocaleDateString()}, Phase 2 ends: ${phase2EndDate.toLocaleDateString()}`,
        phase1End: lastMatchDate.toISOString(),
        phase2End: phase2EndDate.toISOString()
      });
      
    } catch (error) {
      console.error('=== ERROR IN UPDATE SEASON DATA ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/admin/divisions', async (req, res) => {
    try {
      const divisions = await Division.find({}, { _id: 1, name: 1, description: 1 }).lean();
      res.json(divisions);
    } catch (err) {
      console.error('Error fetching divisions:', err);
      res.status(500).json({ error: 'Failed to fetch divisions' });
    }
  });

  app.post('/admin/divisions', async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Division name is required' });
      }
      
      const existingDivision = await Division.findOne({ name });
      if (existingDivision) {
        return res.status(400).json({ error: 'Division already exists' });
      }
      
      const division = new Division({ name, description });
      await division.save();
      res.json({ success: true, division });
    } catch (err) {
      console.error('Error creating division:', err);
      res.status(500).json({ error: 'Failed to create division' });
    }
  });

  app.get('/admin/search-users', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.json([]);
      }
      
      // Use unified system instead of old User model
      const { default: UnifiedUser } = await import('./src/models/UnifiedUser.js');
      const { default: LeagueProfile } = await import('./src/models/LeagueProfile.js');
      const { default: LadderProfile } = await import('./src/models/LadderProfile.js');
      
      const unifiedUsers = await UnifiedUser.find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      }).lean();
      
      // Transform unified users to match the expected format for admin interface
      const users = await Promise.all(unifiedUsers.map(async (user) => {
        const leagueProfile = await LeagueProfile.findOne({ userId: user._id }).lean();
        const ladderProfile = await LadderProfile.findOne({ userId: user._id }).lean();
        
        // Determine system type based on profiles
        let system = 'none';
        if (leagueProfile && ladderProfile) {
          system = 'both';
        } else if (leagueProfile) {
          system = 'league';
        } else if (ladderProfile) {
          system = 'ladder';
        }
        
        return {
          ...user,
          system: system,
          isLeaguePlayer: !!leagueProfile,
          isLadderPlayer: !!ladderProfile,
          divisions: leagueProfile?.divisions || [],
          locations: leagueProfile?.locations || user.locations,
          availability: leagueProfile?.availability || user.availability,
          emergencyContactName: leagueProfile?.emergencyContactName || user.emergencyContactName,
          emergencyContactPhone: leagueProfile?.emergencyContactPhone || user.emergencyContactPhone,
          textNumber: leagueProfile?.textNumber || user.textNumber,
          notes: leagueProfile?.notes || user.notes,
          // Ladder info if available
          ladderName: ladderProfile?.ladderName,
          position: ladderProfile?.position,
          fargoRate: ladderProfile?.fargoRate,
          ladderInfo: ladderProfile ? {
            ladderName: ladderProfile.ladderName,
            position: ladderProfile.position,
            fargoRate: ladderProfile.fargoRate,
            isActive: ladderProfile.isActive
          } : null
        };
      }));
      
      res.json(users);
    } catch (err) {
      console.error('Error searching users:', err);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  app.post('/admin/convert-divisions', async (req, res) => {
    try {
      const { default: User } = await import('./src/models/User.js');
      const users = await User.find({});
      let modified = 0;
      
      for (const user of users) {
        if (user.division && !Array.isArray(user.divisions)) {
          // Convert string division to array
          user.divisions = [user.division];
          await user.save();
          modified++;
        }
      }
      
      res.json({ success: true, modified });
    } catch (err) {
      console.error('Error converting divisions:', err);
      res.status(500).json({ error: 'Failed to convert divisions' });
    }
  });

  app.patch('/admin/user/:userId/add-division', async (req, res) => {
    try {
      const { userId } = req.params;
      const { division } = req.body;
      
      if (!division) {
        return res.status(400).json({ error: 'Division is required' });
      }
      
      // Use unified system instead of old User model
      const { default: UnifiedUser } = await import('./src/models/UnifiedUser.js');
      const { default: LeagueProfile } = await import('./src/models/LeagueProfile.js');
      
      const unifiedUser = await UnifiedUser.findById(userId);
      
      if (!unifiedUser) {
        return res.status(404).json({ error: 'User not found in unified system' });
      }
      
      // Find or create league profile
      let leagueProfile = await LeagueProfile.findOne({ userId });
      if (!leagueProfile) {
        leagueProfile = new LeagueProfile({ userId, divisions: [] });
      }
      
      // Initialize divisions array if it doesn't exist
      if (!leagueProfile.divisions) {
        leagueProfile.divisions = [];
      }
      
      // Add division if not already present
      if (!leagueProfile.divisions.includes(division)) {
        leagueProfile.divisions.push(division);
        await leagueProfile.save();
      }
      
      res.json({ success: true, user: unifiedUser });
    } catch (err) {
      console.error('Error adding division to user:', err);
      res.status(500).json({ error: 'Failed to add division to user' });
    }
  });

  app.patch('/admin/user/:userId/remove-division', async (req, res) => {
    try {
      const { userId } = req.params;
      const { division } = req.body;
      
      if (!division) {
        return res.status(400).json({ error: 'Division is required' });
      }
      
      // Use unified system instead of old User model
      const { default: UnifiedUser } = await import('./src/models/UnifiedUser.js');
      const { default: LeagueProfile } = await import('./src/models/LeagueProfile.js');
      
      const unifiedUser = await UnifiedUser.findById(userId);
      
      if (!unifiedUser) {
        return res.status(404).json({ error: 'User not found in unified system' });
      }
      
      // Find league profile
      const leagueProfile = await LeagueProfile.findOne({ userId });
      
      if (leagueProfile && leagueProfile.divisions) {
        leagueProfile.divisions = leagueProfile.divisions.filter(d => d !== division);
        await leagueProfile.save();
      }
      
      res.json({ success: true, user: unifiedUser });
    } catch (err) {
      console.error('Error removing division from user:', err);
      res.status(500).json({ error: 'Failed to remove division from user' });
    }
  });

  app.post('/admin/sync-users', async (req, res) => {
    try {
      const syncUsersFromSheet = await import('./src/utils/syncUsersFromSheet.js');
      await syncUsersFromSheet.default();
      res.json({ success: true, message: 'Users synced successfully' });
    } catch (err) {
      console.error('Error syncing users:', err);
      res.status(500).json({ error: 'Failed to sync users' });
    }
  });

  app.get('/api/db-usage', async (req, res) => {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }

      const stats = await db.stats();
      const storageUsedMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
      const storageLimitMB = 512; // MongoDB Atlas free tier limit
      const usagePercentage = (storageUsedMB / storageLimitMB) * 100;

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = [];
      
      for (const collection of collections) {
        try {
          const count = await db.collection(collection.name).countDocuments();
          collectionStats.push({
            name: collection.name,
            sizeMB: "0.00", // We can't get exact size without stats()
            count: count
          });
        } catch (err) {
          console.error(`Error getting stats for collection ${collection.name}:`, err);
        }
      }

      const result = {
        storageUsedMB: storageUsedMB.toFixed(2),
        storageLimitMB,
        usagePercentage: usagePercentage.toFixed(1),
        collections: collectionStats,
        warning: usagePercentage > 80 ? 'Database storage limit approaching!' : null,
        critical: usagePercentage > 95 ? 'Database storage limit nearly reached!' : null
      };

      res.json(result);
    } catch (err) {
      console.error('Error getting database usage:', err);
      res.status(500).json({ error: 'Failed to get database usage' });
    }
  });

  app.get('/admin/unentered-matches', async (req, res) => {
    try {
      const Match = await import('./models/Match.js');
      const matches = await Match.default.find({ 
        completed: { $ne: true },
        confirmed: true 
      }).populate('player1 player2').lean();
      
      res.json(matches);
    } catch (err) {
      console.error('Error fetching unentered matches:', err);
      res.status(500).json({ error: 'Failed to fetch unentered matches' });
    }
  });

  app.patch('/admin/mark-lms-entered/:matchId', async (req, res) => {
    try {
      const { matchId } = req.params;
      const Match = await import('./models/Match.js');
      
      const match = await Match.default.findByIdAndUpdate(
        matchId,
        { lmsEntered: true },
        { new: true }
      );
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      res.json({ success: true, match });
    } catch (err) {
      console.error('Error marking match as LMS entered:', err);
      res.status(500).json({ error: 'Failed to mark match as entered' });
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Serve division-specific standings JSON
  app.get('/static/standings_:division.json', (req, res) => {
    const division = req.params.division;
    const filePath = path.join(__dirname, 'public', `standings_${division}.json`);
    
    console.log(`📊 Standings request for division: ${division}`);
    console.log(`📊 File path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Standings file not found: ${filePath}`);
      return res.status(404).json({ 
        error: `Standings file not found for division: ${division}`,
        filePath: filePath
      });
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error sending standings file: ${err.message}`);
        res.status(500).json({ error: 'Failed to send standings file' });
      } else {
        console.log(`✅ Standings file sent successfully: ${filePath}`);
      }
    });
  });

  // Debug route to check static file existence
  app.get('/debug-static', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'public', 'schedule_FRBCAPL_TEST.json');
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.status(404).send('File not found: ' + filePath);
      } else {
        res.send('File exists: ' + filePath);
      }
    });
  });

  app.get('/test-alive', (req, res) => {
    res.send('Backend is alive and running the latest code!');
  });

  // Setup global error handlers
  setupGlobalErrorHandlers();

  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    console.log(`🔍 Detailed health check at http://localhost:${PORT}/health/detailed`);
    console.log(`✅ Readiness check at http://localhost:${PORT}/ready`);
    console.log(`💓 Liveness check at http://localhost:${PORT}/live`);
    console.log(`📈 Metrics available at http://localhost:${PORT}/metrics`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', gracefulShutdown(server));
  process.on('SIGINT', gracefulShutdown(server));

  // Cron job for cleanup
  cron.schedule('0 2 * * *', () => {
    deleteExpiredMatchChannels()
      .then(() => console.log('Expired channels cleaned up!'))
      .catch(err => console.error('Cleanup failed:', err));
  });

  // Add database usage logging on startup
  async function logDatabaseUsage() {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const stats = await db.stats();
        const storageUsedMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
        const storageLimitMB = 512;
        const usagePercentage = (storageUsedMB / storageLimitMB) * 100;
        
        console.log('=== DATABASE USAGE ===');
        console.log(`Storage Used: ${storageUsedMB.toFixed(2)} MB / ${storageLimitMB} MB`);
        console.log(`Usage: ${usagePercentage.toFixed(1)}%`);
        
        if (usagePercentage > 95) {
          console.log('🚨 CRITICAL: Database storage limit nearly reached!');
        } else if (usagePercentage > 80) {
          console.log('⚠️ WARNING: Database storage limit approaching!');
        } else if (usagePercentage > 60) {
          console.log('📊 INFO: Database usage is moderate');
        } else {
          console.log('✅ Database usage is healthy');
        }
        console.log('=====================');
      }
    } catch (err) {
      console.log('Could not check database usage:', err.message);
    }
  }

  
}

// Export app for testing
export { app };

startServer(); 