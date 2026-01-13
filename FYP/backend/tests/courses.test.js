const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const generateToken = require('../utils/generateToken');

describe('Courses API', () => {
  let adminToken;
  let adminId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db');
    }

    // Create admin user
    const admin = await User.create({
      registrationNo: 'ADMINTEST',
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Admin Test',
      role: 'admin'
    });
    adminId = admin._id;
    adminToken = generateToken(adminId);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/courses', () => {
    it('should get all courses', async () => {
      await Course.create({
        courseId: 'CS101',
        courseName: 'Test Course',
        courseCode: 'CS101',
        credits: 3,
        semester: 1,
        program: 'Computer Science',
        maxStudents: 50
      });

      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.courses).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/courses', () => {
    it('should create a new course', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courseId: 'CS201',
          courseName: 'Data Structures',
          courseCode: 'CS201',
          credits: 3,
          semester: 3,
          program: 'Computer Science',
          maxStudents: 40
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.course.courseName).toBe('Data Structures');
    });
  });
});













