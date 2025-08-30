// Unified Database Migration - Simplified Version
// This script will migrate existing User and LadderPlayer data to the new unified structure

async function runMigration() {
    try {
        // Dynamic imports to avoid ES module issues
        const mongoose = await import('mongoose');
        const dotenv = await import('dotenv');
        const bcrypt = await import('bcryptjs');
        
        // Load environment variables
        dotenv.default.config();
        
        console.log('🚀 Starting Unified Database Migration...\n');
        
        // Connect to MongoDB
        await mongoose.default.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Import existing models dynamically
        const User = (await import('./src/models/User.js')).default;
        const LadderPlayer = (await import('./src/models/LadderPlayer.js')).default;
        
        console.log('✅ Loaded existing models');
        
        // Step 1: Create new unified collections
        console.log('\n📋 Step 1: Creating new unified collections...');
        
        // Create UnifiedUser collection
        const unifiedUserSchema = new mongoose.default.Schema({
            // Core Identity
            firstName: { type: String, required: true, trim: true },
            lastName: { type: String, required: true, trim: true },
            email: { type: String, required: true, unique: true, trim: true, lowercase: true },
            pin: { type: String, required: true },
            
            // Contact Info
            phone: { type: String, trim: true },
            emergencyContactName: { type: String, trim: true },
            emergencyContactPhone: { type: String, trim: true },
            
            // Account Status
            isActive: { type: Boolean, default: true },
            isApproved: { type: Boolean, default: false },
            isPendingApproval: { type: Boolean, default: false },
            isAdmin: { type: Boolean, default: false },
            isSuperAdmin: { type: Boolean, default: false },
            isPlatformAdmin: { type: Boolean, default: false },
            
            // Account Management
            role: { type: String, enum: ['player', 'admin', 'super_admin'], default: 'player' },
            permissions: { type: Object, default: {} },
            approvalDate: { type: Date },
            approvedBy: { type: String },
            registrationDate: { type: Date, default: Date.now },
            lastLogin: { type: Date },
            
            // Preferences
            preferredContacts: [{ type: String }],
            preferences: {
                googleCalendarIntegration: { type: Boolean, default: false },
                emailNotifications: { type: Boolean, default: true }
            },
            
            // Metadata
            notes: { type: String },
            claimMessage: { type: String }
        }, { timestamps: true });
        
        const UnifiedUser = mongoose.default.model('UnifiedUser', unifiedUserSchema);
        
        // Create LeagueProfile collection
        const leagueProfileSchema = new mongoose.default.Schema({
            userId: { type: mongoose.default.Schema.Types.ObjectId, ref: 'UnifiedUser', required: true },
            
            // League Info
            divisions: [{ type: String }],
            division: { type: String },
            
            // Availability & Locations
            availability: {
                Mon: [{ type: String }],
                Tue: [{ type: String }],
                Wed: [{ type: String }],
                Thu: [{ type: String }],
                Fri: [{ type: String }],
                Sat: [{ type: String }],
                Sun: [{ type: String }]
            },
            locations: { type: String },
            
            // League Stats
            totalMatches: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            
            // Payment Info
            paymentStatus: { type: String, default: 'pending' },
            hasPaidRegistrationFee: { type: Boolean, default: false },
            paymentHistory: [{ type: Object }],
            
            // Penalties
            penalties: [{ type: Object }]
        }, { timestamps: true });
        
        const LeagueProfile = mongoose.default.model('LeagueProfile', leagueProfileSchema);
        
        // Create LadderProfile collection
        const ladderProfileSchema = new mongoose.default.Schema({
            userId: { type: mongoose.default.Schema.Types.ObjectId, ref: 'UnifiedUser', required: true },
            
            // Ladder Info
            ladderId: { type: mongoose.default.Schema.Types.ObjectId, required: true },
            ladderName: { type: String, required: true, enum: ['499-under', '500-549', '550-plus'] },
            position: { type: Number, required: true, min: 1 },
            
            // Rating & Stats
            fargoRate: { type: Number, required: true, min: 0, max: 9999 },
            totalMatches: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            
            // Status & Immunity
            isActive: { type: Boolean, default: true },
            immunityUntil: { type: Date },
            vacationMode: { type: Boolean, default: false },
            vacationUntil: { type: Date },
            
            // Challenge Tracking
            activeChallenges: [{
                challengeId: { type: mongoose.default.Schema.Types.ObjectId },
                type: { type: String, enum: ['challenge', 'ladder-jump', 'smackdown', 'smackback'] },
                status: { type: String, enum: ['pending', 'accepted', 'scheduled', 'completed', 'cancelled'] }
            }],
            
            // Match History
            recentMatches: [{ type: Object }]
        }, { timestamps: true });
        
        const LadderProfile = mongoose.default.model('LadderProfile', ladderProfileSchema);
        
        console.log('✅ Created new unified models');
        
        // Step 2: Get existing data
        console.log('\n📋 Step 2: Fetching existing data...');
        
        const leagueUsers = await User.find({});
        const ladderPlayers = await LadderPlayer.find({});
        
        console.log(`📊 Found ${leagueUsers.length} league users`);
        console.log(`📊 Found ${ladderPlayers.length} ladder players`);
        
        // Step 3: Migrate league users to unified structure
        console.log('\n📋 Step 3: Migrating league users...');
        
        const unifiedUsers = new Map(); // email -> unified user
        
        for (const leagueUser of leagueUsers) {
            if (!leagueUser.email) {
                console.log(`⚠️  Skipping league user without email: ${leagueUser.firstName} ${leagueUser.lastName}`);
                continue;
            }
            
            const email = leagueUser.email.toLowerCase();
            
            // Create unified user
            const unifiedUser = new UnifiedUser({
                firstName: leagueUser.firstName,
                lastName: leagueUser.lastName,
                email: email,
                pin: leagueUser.pin || leagueUser.id, // Use existing pin or id
                phone: leagueUser.phone,
                isActive: leagueUser.isActive,
                isApproved: leagueUser.isApproved,
                isPendingApproval: leagueUser.isPendingApproval,
                isAdmin: leagueUser.isAdmin,
                isSuperAdmin: leagueUser.isSuperAdmin,
                isPlatformAdmin: leagueUser.isPlatformAdmin,
                role: leagueUser.isAdmin ? 'admin' : 'player',
                permissions: leagueUser.permissions || {},
                approvalDate: leagueUser.approvalDate,
                approvedBy: leagueUser.approvedBy,
                registrationDate: leagueUser.registrationDate || leagueUser.createdAt,
                lastLogin: leagueUser.lastLogin,
                preferredContacts: leagueUser.preferredContacts || [],
                preferences: leagueUser.preferences || {
                    googleCalendarIntegration: false,
                    emailNotifications: true
                },
                notes: leagueUser.notes,
                claimMessage: leagueUser.claimMessage
            });
            
            await unifiedUser.save();
            unifiedUsers.set(email, unifiedUser);
            
            console.log(`✅ Created unified user: ${unifiedUser.firstName} ${unifiedUser.lastName} (${email})`);
        }
        
        // Step 4: Create unified users from ladder players (if not already created)
        console.log('\n📋 Step 4: Migrating ladder players...');
        
        const nameCounts = new Map(); // name -> count for handling duplicates
        
        for (const ladderPlayer of ladderPlayers) {
            const email = ladderPlayer.email ? ladderPlayer.email.toLowerCase() : null;
            
            if (email && unifiedUsers.has(email)) {
                // Player already exists in unified system
                console.log(`✅ Ladder player already unified: ${ladderPlayer.firstName} ${ladderPlayer.lastName} (${email})`);
                continue;
            }
            
            if (!email) {
                // Create email from name for ladder players without email
                const baseName = `${ladderPlayer.firstName.toLowerCase()}.${ladderPlayer.lastName.toLowerCase()}`;
                const nameKey = `${ladderPlayer.firstName} ${ladderPlayer.lastName}`;
                
                // Handle duplicates by adding a number
                const count = nameCounts.get(nameKey) || 0;
                nameCounts.set(nameKey, count + 1);
                
                const generatedEmail = count === 0 
                    ? `${baseName}@ladder.local`
                    : `${baseName}${count}@ladder.local`;
                
                console.log(`⚠️  Generated email for ladder player: ${ladderPlayer.firstName} ${ladderPlayer.lastName} -> ${generatedEmail}`);
                
                const unifiedUser = new UnifiedUser({
                    firstName: ladderPlayer.firstName,
                    lastName: ladderPlayer.lastName,
                    email: generatedEmail,
                    pin: ladderPlayer.pin || `${ladderPlayer.firstName}${ladderPlayer.lastName}`,
                    isActive: ladderPlayer.isActive,
                    isApproved: true, // Ladder players are approved
                    role: 'player',
                    registrationDate: new Date(),
                    preferences: {
                        googleCalendarIntegration: false,
                        emailNotifications: true
                    }
                });
                
                await unifiedUser.save();
                unifiedUsers.set(generatedEmail, unifiedUser);
                console.log(`✅ Created unified user from ladder: ${unifiedUser.firstName} ${unifiedUser.lastName} (${generatedEmail})`);
            } else {
                // Create new unified user for ladder player with email
                const unifiedUser = new UnifiedUser({
                    firstName: ladderPlayer.firstName,
                    lastName: ladderPlayer.lastName,
                    email: email,
                    pin: ladderPlayer.pin || `${ladderPlayer.firstName}${ladderPlayer.lastName}`,
                    isActive: ladderPlayer.isActive,
                    isApproved: true,
                    role: 'player',
                    registrationDate: new Date(),
                    preferences: {
                        googleCalendarIntegration: false,
                        emailNotifications: true
                    }
                });
                
                await unifiedUser.save();
                unifiedUsers.set(email, unifiedUser);
                console.log(`✅ Created unified user from ladder: ${unifiedUser.firstName} ${unifiedUser.lastName} (${email})`);
            }
        }
        
        // Step 5: Create league profiles
        console.log('\n📋 Step 5: Creating league profiles...');
        
        for (const leagueUser of leagueUsers) {
            if (!leagueUser.email) continue;
            
            const email = leagueUser.email.toLowerCase();
            const unifiedUser = unifiedUsers.get(email);
            
            if (!unifiedUser) {
                console.log(`⚠️  No unified user found for league user: ${leagueUser.firstName} ${leagueUser.lastName}`);
                continue;
            }
            
            const leagueProfile = new LeagueProfile({
                userId: unifiedUser._id,
                divisions: leagueUser.divisions || [],
                division: leagueUser.division || '',
                availability: leagueUser.availability || {
                    Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
                },
                locations: leagueUser.locations || '',
                totalMatches: leagueUser.totalMatches || 0,
                wins: leagueUser.wins || 0,
                losses: leagueUser.losses || 0,
                paymentStatus: leagueUser.paymentStatus || 'pending',
                hasPaidRegistrationFee: leagueUser.hasPaidRegistrationFee || false,
                paymentHistory: leagueUser.paymentHistory || [],
                penalties: leagueUser.penalties || []
            });
            
            await leagueProfile.save();
            console.log(`✅ Created league profile for: ${unifiedUser.firstName} ${unifiedUser.lastName}`);
        }
        
        // Step 6: Create ladder profiles
        console.log('\n📋 Step 6: Creating ladder profiles...');
        
        nameCounts.clear(); // Reset for ladder profiles
        
        for (const ladderPlayer of ladderPlayers) {
            const email = ladderPlayer.email ? ladderPlayer.email.toLowerCase() : null;
            const nameKey = `${ladderPlayer.firstName} ${ladderPlayer.lastName}`;
            
            // Handle duplicates by adding a number
            const count = nameCounts.get(nameKey) || 0;
            nameCounts.set(nameKey, count + 1);
            
            let lookupEmail;
            if (email) {
                lookupEmail = email;
            } else {
                const baseName = `${ladderPlayer.firstName.toLowerCase()}.${ladderPlayer.lastName.toLowerCase()}`;
                lookupEmail = count === 0 
                    ? `${baseName}@ladder.local`
                    : `${baseName}${count}@ladder.local`;
            }
            
            const unifiedUser = unifiedUsers.get(lookupEmail);
            
            if (!unifiedUser) {
                console.log(`⚠️  No unified user found for ladder player: ${ladderPlayer.firstName} ${ladderPlayer.lastName}`);
                continue;
            }
            
            const ladderProfile = new LadderProfile({
                userId: unifiedUser._id,
                ladderId: ladderPlayer.ladderId,
                ladderName: ladderPlayer.ladderName,
                position: ladderPlayer.position,
                fargoRate: ladderPlayer.fargoRate,
                totalMatches: ladderPlayer.totalMatches || 0,
                wins: ladderPlayer.wins || 0,
                losses: ladderPlayer.losses || 0,
                isActive: ladderPlayer.isActive,
                immunityUntil: ladderPlayer.immunityUntil,
                vacationMode: ladderPlayer.vacationMode || false,
                vacationUntil: ladderPlayer.vacationUntil,
                activeChallenges: ladderPlayer.activeChallenges || [],
                recentMatches: ladderPlayer.recentMatches || []
            });
            
            await ladderProfile.save();
            console.log(`✅ Created ladder profile for: ${unifiedUser.firstName} ${unifiedUser.lastName} (Position ${ladderPlayer.position})`);
        }
        
        // Step 7: Verification
        console.log('\n📋 Step 7: Verifying migration...');
        
        const totalUnifiedUsers = await UnifiedUser.countDocuments();
        const totalLeagueProfiles = await LeagueProfile.countDocuments();
        const totalLadderProfiles = await LadderProfile.countDocuments();
        
        console.log(`📊 Migration Results:`);
        console.log(`   - Unified Users: ${totalUnifiedUsers}`);
        console.log(`   - League Profiles: ${totalLeagueProfiles}`);
        console.log(`   - Ladder Profiles: ${totalLadderProfiles}`);
        
        // Test Tom's data specifically
        const tomUnified = await UnifiedUser.findOne({ email: 'tomtowman2121@gmail.com' });
        if (tomUnified) {
            const tomLeague = await LeagueProfile.findOne({ userId: tomUnified._id });
            const tomLadder = await LadderProfile.findOne({ userId: tomUnified._id });
            
            console.log(`\n🎯 Tom's Migration Status:`);
            console.log(`   - Unified User: ${tomUnified ? '✅ Created' : '❌ Missing'}`);
            console.log(`   - League Profile: ${tomLeague ? '✅ Created' : '❌ Missing'}`);
            console.log(`   - Ladder Profile: ${tomLadder ? '✅ Created' : '❌ Missing'}`);
            
            if (tomUnified && tomLeague && tomLadder) {
                console.log(`\n🎉 SUCCESS! Tom's data is now unified and should work properly!`);
            }
        }
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Update authentication endpoints to use UnifiedUser');
        console.log('   2. Update player status endpoints to use new structure');
        console.log('   3. Test all functionality with new unified system');
        console.log('   4. Remove old collections after verification');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Disconnect from MongoDB
        const mongoose = await import('mongoose');
        await mongoose.default.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the migration
runMigration();
