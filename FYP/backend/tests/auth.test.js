const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const mongoose = require('mongoose');

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db');
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          registrationNo: 'TEST001',
          email: 'test@test.com',
          password: 'test123',
          name: 'Test User',
          role: 'student',
          semester: 3,
          program: 'Computer Science'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('student');
    });

    it('should not register with duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          registrationNo: 'TEST002',
          email: 'test@test.com',
          password: 'test123',
          name: 'Test User 2',
          role: 'student',
          semester: 3,
          program: 'Computer Science'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          registrationNo: 'TEST003',
          email: 'test@test.com',
          password: 'test123',
          name: 'Test User 3',
          role: 'student',
          semester: 3,
          program: 'Computer Science'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await User.create({
        registrationNo: 'LOGIN001',
        email: 'login@test.com',
        password: 'test123',
        name: 'Login User',
        role: 'student',
        semester: 3,
        program: 'Computer Science'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'test123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});













