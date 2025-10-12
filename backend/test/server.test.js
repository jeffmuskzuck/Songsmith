import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('API', () => {
  it('GET /health ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/generate returns songs', async () => {
    const payload = { genre: 'pop', duration: '2:30', prompt: 'city lights', count: 2 };
    const res = await request(app).post('/api/generate').send(payload);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.songs)).toBe(true);
    expect(res.body.songs).toHaveLength(2);
    const s0 = res.body.songs[0];
    expect(s0).toHaveProperty('id');
    expect(s0).toHaveProperty('title');
    expect(s0).toHaveProperty('lyrics');
    expect(s0.genre).toBe('pop');
    expect(s0.duration).toBe('2:30');
  });
});
