require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => { console.error(err); process.exit(1); });

const proposalSchema = new mongoose.Schema({}, { strict: false });
const Proposal = mongoose.model('Proposal', proposalSchema, 'proposals');

async function addCompletedField() {
  try {
    const result = await Proposal.updateMany(
      { completed: { $exists: false } },
      { $set: { completed: false } }
    );
    console.log(`Updated ${result.modifiedCount} proposals.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

addCompletedField();
