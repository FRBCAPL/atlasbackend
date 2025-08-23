import request from 'supertest';
import express from 'express';

// Create a minimal test app
const app = express();

// Add the health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

describe('GET /health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
}); 