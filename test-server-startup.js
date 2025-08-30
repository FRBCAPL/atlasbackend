import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Test URL: http://localhost:${PORT}/test`);
});
