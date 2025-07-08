import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Connect to your MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const proposalSchema = new mongoose.Schema({}, { strict: false });
const Proposal = mongoose.model('Proposal', proposalSchema, 'proposals');

async function addDivision() {
  try {
    const result = await Proposal.updateMany(
      {}, // all documents
      { $set: { division: ["FRBCAPL TEST"] } }
    );
    console.log(`Updated ${result.modifiedCount || result.nModified} proposals.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

addDivision();
