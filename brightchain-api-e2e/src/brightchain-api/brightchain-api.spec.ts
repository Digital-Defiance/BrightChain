import axios from 'axios';

describe('GET /api/health', () => {
  it('should return healthy status', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      status: 'healthy',
    });
    expect(res.data).toHaveProperty('uptime');
    expect(res.data).toHaveProperty('timestamp');
    expect(res.data).toHaveProperty('version');
  });
});
