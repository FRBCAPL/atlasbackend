import mongoose from 'mongoose';
import League from '../models/League.js';

class DatabaseService {
  constructor() {
    this.connections = new Map(); // Cache for database connections
    this.defaultConnection = null; // Connection to main league registry
  }

  /**
   * Connect to the main league registry database
   */
  async connectToRegistry() {
    if (this.defaultConnection) {
      return this.defaultConnection;
    }

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
      this.defaultConnection = await mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ Connected to league registry database');
      return this.defaultConnection;
    } catch (error) {
      console.error('❌ Failed to connect to league registry:', error);
      throw error;
    }
  }

  /**
   * Get or create connection to a specific league's database
   */
  async getLeagueConnection(leagueId) {
    // Check if we already have a connection cached
    if (this.connections.has(leagueId)) {
      return this.connections.get(leagueId);
    }

    // Get league configuration from registry
    const registryConnection = await this.connectToRegistry();
    const LeagueModel = registryConnection.model('League', League.schema);
    
    const league = await LeagueModel.findOne({ leagueId, isActive: true });
    if (!league) {
      throw new Error(`League not found or inactive: ${leagueId}`);
    }

    // Check subscription status
    if (league.subscription.status === 'expired' || league.subscription.status === 'cancelled') {
      throw new Error(`League subscription is ${league.subscription.status}: ${leagueId}`);
    }

    // Create connection to league's database
    try {
      const connection = await mongoose.createConnection(league.databaseConfig.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      // Cache the connection
      this.connections.set(leagueId, {
        connection,
        league,
        lastUsed: new Date()
      });

      console.log(`✅ Connected to league database: ${leagueId}`);
      return this.connections.get(leagueId);
    } catch (error) {
      console.error(`❌ Failed to connect to league database ${leagueId}:`, error);
      throw error;
    }
  }

  /**
   * Get league configuration without creating a connection
   */
  async getLeagueConfig(leagueId) {
    const registryConnection = await this.connectToRegistry();
    const LeagueModel = registryConnection.model('League', League.schema);
    
    const league = await LeagueModel.findOne({ leagueId, isActive: true });
    if (!league) {
      throw new Error(`League not found or inactive: ${leagueId}`);
    }

    return league;
  }

  /**
   * Create a new league with its own database
   */
  async createLeague(leagueData) {
    const registryConnection = await this.connectToRegistry();
    const LeagueModel = registryConnection.model('League', League.schema);

    // Generate unique database name
    const databaseName = `league_${leagueData.leagueId}_${Date.now()}`;
    
    // Create connection string for new database
    const baseUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const connectionString = baseUri.replace(/\/[^\/]+$/, `/${databaseName}`);

    // Create league record
    const league = new LeagueModel({
      ...leagueData,
      databaseConfig: {
        connectionString,
        databaseName,
        isActive: true
      }
    });

    await league.save();

    // Initialize the new database with required collections
    await this.initializeLeagueDatabase(connectionString);

    console.log(`✅ Created new league: ${leagueData.leagueId}`);
    return league;
  }

  /**
   * Initialize a new league database with required collections
   */
  async initializeLeagueDatabase(connectionString) {
    const connection = await mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Import and register models for the new database
    const User = connection.model('User', (await import('../models/User.js')).default.schema);
    const Proposal = connection.model('Proposal', (await import('../models/Proposal.js')).default.schema);
    const Match = connection.model('Match', (await import('../models/Match.js')).default.schema);
    const Division = connection.model('Division', (await import('../models/Division.js')).default.schema);
    const Season = connection.model('Season', (await import('../models/Season.js')).default.schema);
    const ChallengeStats = connection.model('ChallengeStats', (await import('../models/ChallengeStats.js')).default.schema);
    const LeagueConfig = connection.model('LeagueConfig', (await import('../models/LeagueConfig.js')).default.schema);

    // Create indexes
    await User.createIndexes();
    await Proposal.createIndexes();
    await Match.createIndexes();
    await Division.createIndexes();
    await Season.createIndexes();
    await ChallengeStats.createIndexes();
    await LeagueConfig.createIndexes();

    console.log('✅ Initialized new league database with collections and indexes');
    return connection;
  }

  /**
   * Close a specific league connection
   */
  async closeLeagueConnection(leagueId) {
    const connectionData = this.connections.get(leagueId);
    if (connectionData) {
      await connectionData.connection.close();
      this.connections.delete(leagueId);
      console.log(`✅ Closed connection to league: ${leagueId}`);
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections() {
    for (const [leagueId, connectionData] of this.connections) {
      await connectionData.connection.close();
    }
    this.connections.clear();

    if (this.defaultConnection) {
      await this.defaultConnection.close();
      this.defaultConnection = null;
    }

    console.log('✅ Closed all database connections');
  }

  /**
   * Clean up old connections (for memory management)
   */
  async cleanupOldConnections(maxAgeMinutes = 30) {
    const now = new Date();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds

    for (const [leagueId, connectionData] of this.connections) {
      if (now - connectionData.lastUsed > maxAge) {
        await this.closeLeagueConnection(leagueId);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.keys()),
      defaultConnectionActive: !!this.defaultConnection
    };
  }
}

// Export singleton instance
export default new DatabaseService();
