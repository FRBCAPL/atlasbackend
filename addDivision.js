require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // <-- Use the shared model

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

User.updateMany(
  {},
  { $set: { division: "FRBCAPL TEST" } }
)
  .then((res) => {
    console.log(`Updated ${res.modifiedCount} users.`);
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Error:", err);
    mongoose.disconnect();
  });
