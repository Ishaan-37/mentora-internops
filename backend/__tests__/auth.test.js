// __tests__/auth.test.js
// Unit + integration tests for authentication and RBAC
// Run with: npm test
// Requires a test database (set DATABASE_URL to a test DB in .env.test)

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET         = 'test-jwt-secret-internops-test-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-internops-test-only';
process.env.JWT_EXPIRES_IN     = '1h';
process.env.BCRYPT_ROUNDS      = '4'; // low cost for speed in tests

const request = require('supertest');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');

// Mock the DB module so tests don't require a live database
jest.mock('../config/db', () => ({
  query:       jest.fn(),
  getClient:   jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(new Date()),
}));

jest.mock('../config/logger', () => ({
  info:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http:  jest.fn(),
  warn:  jest.fn(),
}));

const app = require('../server');
const db  = require('../config/db');

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const makeUser = (overrides = {}) => ({
  id:            'user-uuid-1234',
  name:          'Test Intern',
  email:         'intern@iitjammu.ac.in',
  password_hash: bcrypt.hashSync('Test@1234', 4),
  role:          'intern',
  is_active:     true,
  ...overrides,
});

const makeAdminUser = (overrides = {}) => makeUser({
  id:   'admin-uuid-5678',
  name: 'Test Admin',
  email: 'admin@iitjammu.ac.in',
  role: 'admin',
  ...overrides,
});

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Test@1234' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for non-existent user', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // no user found

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@iitjammu.ac.in', password: 'Test@1234' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('returns 401 for wrong password', async () => {
    const user = makeUser();
    db.query
      .mockResolvedValueOnce({ rows: [user] })  // user found
      .mockResolvedValueOnce({ rows: [] });       // update last_login (won't be reached)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
  });

  it('returns 403 for deactivated account', async () => {
    const user = makeUser({ is_active: false });
    db.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@1234' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('returns 200 with access token on successful login', async () => {
    const user = makeUser();
    db.query
      .mockResolvedValueOnce({ rows: [user] }) // fetch user
      .mockResolvedValueOnce({ rows: [] });    // update last_login

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('intern');
    // httpOnly cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

// ------------------------------------------------------------------
// GET /api/auth/me
// ------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user data with valid token', async () => {
    const user = makeUser();
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // authenticate middleware check
    db.query.mockResolvedValueOnce({ rows: [user] });
    // me() controller base user query
    db.query.mockResolvedValueOnce({ rows: [{ ...user, last_login_at: null, created_at: new Date() }] });
    // me() intern profile query
    db.query.mockResolvedValueOnce({ rows: [{ status: 'active', start_date: '2026-05-01', end_date: '2026-07-31', batch_name: 'Summer 2026', mentor_name: 'Dr. Yamuna' }] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.role).toBe('intern');
  });
});

// ------------------------------------------------------------------
// RBAC: requireAdmin middleware
// ------------------------------------------------------------------
describe('RBAC — Admin-only routes', () => {
  it('returns 403 when intern tries to access admin route', async () => {
    const intern = makeUser();
    const token  = jwt.sign({ userId: intern.id, role: intern.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    db.query.mockResolvedValueOnce({ rows: [intern] }); // authenticate

    const res = await request(app)
      .get('/api/admin/all-users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  it('allows admin to access admin-only route', async () => {
    const admin = makeAdminUser();
    const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    db.query
      .mockResolvedValueOnce({ rows: [admin] })  // authenticate
      .mockResolvedValueOnce({ rows: [] });        // getAllUsers returns empty list

    const res = await request(app)
      .get('/api/admin/all-users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toBeDefined();
  });
});

// ------------------------------------------------------------------
// POST /api/auth/change-password
// ------------------------------------------------------------------
describe('POST /api/auth/change-password', () => {
  it('returns 400 if new password is too weak', async () => {
    const user  = makeUser();
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    db.query.mockResolvedValueOnce({ rows: [user] }); // authenticate

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Test@1234', newPassword: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
