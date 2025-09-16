import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Models for USA Pool League Dues Tracker
const DivisionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  duesPerPlayerPerMatch: { type: Number, required: true },
  numberOfTeams: { type: Number, required: true },
  totalWeeks: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isDoublePlay: { type: Boolean, default: false },
  currentTeams: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'USAPoolLeagueDivisions' });

const TeamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  division: { type: String, required: true },
  divisionDuesRate: { type: Number, required: true },
  numberOfTeams: { type: Number, required: true },
  totalWeeks: { type: Number, required: true },
  playerCount: { type: Number, required: true },
  duesAmount: { type: Number, required: true },
  duesPaid: { type: Boolean, default: false },
  paymentDate: Date,
  paymentMethod: String,
  notes: String,
  weeklyPayments: [{
    week: { type: Number, required: true },
    paid: { type: String, default: 'false' },
    paymentDate: Date,
    paymentMethod: String,
    amount: Number,
    notes: String,
    bcaSanctionPlayers: [{ type: String }]
  }],
  teamMembers: [{
    name: { type: String, required: true },
    email: String,
    phone: String,
    bcaSanctionPaid: { type: Boolean, default: false },
    previouslySanctioned: { type: Boolean, default: false }
  }],
  captainName: { type: String, required: true },
  captainEmail: { type: String },
  captainPhone: String,
  captainPreviouslySanctioned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'USAPoolLeagueTeams' });

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
}, { collection: 'USAPoolLeagueAdmins' });

// Use different collection names to avoid conflicts with Front Range Pool Hub
const Division = mongoose.model('USAPoolLeagueDivision', DivisionSchema);
const Team = mongoose.model('USAPoolLeagueTeam', TeamSchema);
const Admin = mongoose.model('USAPoolLeagueAdmin', AdminSchema);

// Auth middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'front-range-pool-hub-dev-secret-key-2024');
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || 'front-range-pool-hub-dev-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Division API endpoints
router.get('/divisions', async (req, res) => {
  try {
    const divisions = await Division.find().sort({ name: 1 });
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/divisions', async (req, res) => {
  try {
    const divisionData = req.body;
    const division = new Division(divisionData);
    await division.save();
    res.status(201).json(division);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Division name already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

router.put('/divisions/:id', async (req, res) => {
  try {
    const division = await Division.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!division) {
      return res.status(404).json({ message: 'Division not found' });
    }
    res.json(division);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/divisions/:id', async (req, res) => {
  try {
    const division = await Division.findByIdAndDelete(req.params.id);
    if (!division) {
      return res.status(404).json({ message: 'Division not found' });
    }
    res.json({ message: 'Division deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Team API endpoints
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ teamName: 1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const teamData = req.body;
    
    // Get division details
    const division = await Division.findOne({ name: teamData.division });
    if (!division) {
      return res.status(400).json({ message: 'Division not found' });
    }
    
    // Check if division has space for more teams
    if (division.currentTeams >= division.numberOfTeams) {
      return res.status(400).json({ message: 'Division is full' });
    }
    
    // Set team data from division
    teamData.divisionDuesRate = division.duesPerPlayerPerMatch;
    teamData.numberOfTeams = division.numberOfTeams;
    teamData.totalWeeks = division.totalWeeks;
    teamData.isDoublePlay = division.isDoublePlay;
    teamData.playerCount = teamData.teamMembers ? teamData.teamMembers.length : 0;
    
    // Calculate dues: for double play, teams play 10 matches per week (5 of each game)
    const matchesPerWeek = division.isDoublePlay ? 10 : 5;
    teamData.duesAmount = teamData.divisionDuesRate * teamData.playerCount * matchesPerWeek * teamData.totalWeeks;
    
    const team = new Team(teamData);
    await team.save();
    
    // Update division team count
    await Division.findByIdAndUpdate(division._id, { 
      currentTeams: division.currentTeams + 1,
      updatedAt: new Date()
    });
    
    res.status(201).json(team);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Team name already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

router.put('/teams/:id', async (req, res) => {
  try {
    const teamData = req.body;
    const existingTeam = await Team.findById(req.params.id);
    if (!existingTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // If division changed, get new division details
    if (teamData.division && teamData.division !== existingTeam.division) {
      const newDivision = await Division.findOne({ name: teamData.division });
      if (!newDivision) {
        return res.status(400).json({ message: 'Division not found' });
      }
      
      // Check if new division has space
      if (newDivision.currentTeams >= newDivision.numberOfTeams) {
        return res.status(400).json({ message: 'Division is full' });
      }
      
      // Update division team counts
      await Division.findOneAndUpdate(
        { name: existingTeam.division },
        { $inc: { currentTeams: -1 } }
      );
      await Division.findOneAndUpdate(
        { name: teamData.division },
        { $inc: { currentTeams: 1 } }
      );
      
      teamData.divisionDuesRate = newDivision.duesPerPlayerPerMatch;
      teamData.numberOfTeams = newDivision.numberOfTeams;
      teamData.totalWeeks = newDivision.totalWeeks;
      teamData.isDoublePlay = newDivision.isDoublePlay;
    }
    
    // Recalculate dues amount if team members changed
    if (teamData.teamMembers) {
      teamData.playerCount = teamData.teamMembers.length;
      const matchesPerWeek = teamData.isDoublePlay ? 10 : 5;
      teamData.duesAmount = teamData.divisionDuesRate * teamData.playerCount * matchesPerWeek * teamData.totalWeeks;
    }
    
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { ...teamData, updatedAt: new Date() },
      { new: true }
    );
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Update division team count
    await Division.findOneAndUpdate(
      { name: team.division },
      { $inc: { currentTeams: -1 } }
    );
    
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark team dues as paid
router.post('/teams/:id/pay-dues', async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      {
        duesPaid: true,
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'Cash',
        notes: notes || '',
        updatedAt: new Date()
      },
      { new: true }
    );
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark weekly payment
router.post('/teams/:id/weekly-payment', async (req, res) => {
  try {
    const { week, paid, paymentMethod, amount, notes, bcaSanctionPlayers } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Find existing weekly payment or create new one
    const existingPayment = team.weeklyPayments.find(p => p.week === week);
    
    if (existingPayment) {
      // Update existing payment
      existingPayment.paid = paid;
      existingPayment.paymentDate = (paid === 'true') ? new Date() : null;
      existingPayment.paymentMethod = paymentMethod || '';
      existingPayment.amount = amount || 0;
      existingPayment.notes = notes || '';
      existingPayment.bcaSanctionPlayers = bcaSanctionPlayers || [];
    } else {
      // Add new weekly payment
      team.weeklyPayments.push({
        week,
        paid,
        paymentDate: (paid === 'true') ? new Date() : null,
        paymentMethod: paymentMethod || '',
        amount: amount || 0,
        notes: notes || '',
        bcaSanctionPlayers: bcaSanctionPlayers || []
      });
    }
    
    await team.save();
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment summary
router.get('/summary', async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const paidTeams = await Team.countDocuments({ duesPaid: true });
    const unpaidTeams = totalTeams - paidTeams;
    const totalDuesCollected = await Team.aggregate([
      { $match: { duesPaid: true } },
      { $group: { _id: null, total: { $sum: '$duesAmount' } } }
    ]);
    
    // Get division breakdown
    const divisionBreakdown = await Team.aggregate([
      {
        $group: {
          _id: '$division',
          count: { $sum: 1 },
          paid: { $sum: { $cond: ['$duesPaid', 1, 0] } },
          total: { $sum: '$duesAmount' }
        }
      }
    ]);
    
    res.json({
      totalTeams,
      paidTeams,
      unpaidTeams,
      totalDuesCollected: totalDuesCollected[0]?.total || 0,
      divisionBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Initialize admin user if none exists
const initializeAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        10
      );
      const admin = new Admin({
        email: process.env.ADMIN_EMAIL || 'admin@yourleague.com',
        password: hashedPassword,
        name: 'USA Pool League Administrator'
      });
      await admin.save();
      console.log('Default admin user created for USA Pool League Dues Tracker');
      console.log('Email:', process.env.ADMIN_EMAIL || 'admin@yourleague.com');
      console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
};

// Initialize admin on startup
initializeAdmin();

export default router;
