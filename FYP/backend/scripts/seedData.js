const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');
const connectDB = require('../config/database');

dotenv.config();

// Helper function to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Class.deleteMany({});

    console.log('Cleared existing data...');

    // Hash passwords first
    const adminPassword = await hashPassword('admin123');
    const teacherPassword = await hashPassword('teacher123');
    const studentPassword = await hashPassword('student123');

    // Create Admin
    const admin = await User.create({
      registrationNo: 'ADMIN001',
      email: 'admin@university.edu',
      password: adminPassword,
      name: 'System Administrator',
      role: 'admin'
    });
    console.log('Admin created:', admin.email);

    // Create Teachers
    const teachers = await User.insertMany([
      {
        registrationNo: 'T001',
        email: 'teacher1@university.edu',
        password: teacherPassword,
        name: 'Dr. John Smith',
        role: 'teacher'
      },
      {
        registrationNo: 'T002',
        email: 'teacher2@university.edu',
        password: teacherPassword,
        name: 'Dr. Sarah Johnson',
        role: 'teacher'
      },
      {
        registrationNo: 'T003',
        email: 'teacher3@university.edu',
        password: teacherPassword,
        name: 'Dr. Michael Brown',
        role: 'teacher'
      }
    ]);
    console.log('Teachers created:', teachers.length);

    // Create Students
    const students = await User.insertMany([
      {
        registrationNo: 'S001',
        email: 'student1@university.edu',
        password: studentPassword,
        name: 'Alice Williams',
        role: 'student',
        semester: 3,
        program: 'Computer Science'
      },
      {
        registrationNo: 'S002',
        email: 'student2@university.edu',
        password: studentPassword,
        name: 'Bob Davis',
        role: 'student',
        semester: 3,
        program: 'Computer Science'
      },
      {
        registrationNo: 'S003',
        email: 'student3@university.edu',
        password: studentPassword,
        name: 'Charlie Miller',
        role: 'student',
        semester: 5,
        program: 'Software Engineering'
      }
    ]);
    console.log('Students created:', students.length);

    // Create Courses
    const courses = await Course.insertMany([
      {
        courseId: 'CS101',
        courseName: 'Introduction to Programming',
        courseCode: 'CS101',
        credits: 3,
        semester: 1,
        program: 'Computer Science',
        maxStudents: 50,
        description: 'Basic programming concepts'
      },
      {
        courseId: 'CS201',
        courseName: 'Data Structures',
        courseCode: 'CS201',
        credits: 3,
        semester: 3,
        program: 'Computer Science',
        prerequisites: ['CS101'],
        maxStudents: 40,
        description: 'Fundamental data structures'
      },
      {
        courseId: 'CS301',
        courseName: 'Database Systems',
        courseCode: 'CS301',
        credits: 3,
        semester: 5,
        program: 'Computer Science',
        prerequisites: ['CS201'],
        maxStudents: 35,
        description: 'Database design and management'
      },
      {
        courseId: 'SE201',
        courseName: 'Software Engineering',
        courseCode: 'SE201',
        credits: 3,
        semester: 3,
        program: 'Software Engineering',
        prerequisites: ['CS101'],
        maxStudents: 40,
        description: 'Software development methodologies'
      },
      {
        courseId: 'CS401',
        courseName: 'Machine Learning',
        courseCode: 'CS401',
        credits: 3,
        semester: 7,
        program: 'Computer Science',
        prerequisites: ['CS301'],
        maxStudents: 30,
        description: 'Introduction to machine learning'
      }
    ]);
    console.log('Courses created:', courses.length);

    // Create Classrooms
    const classes = await Class.insertMany([
      {
        className: 'A101',
        capacity: 50,
        location: 'Building A, First Floor',
        facilities: ['Projector', 'Whiteboard', 'WiFi']
      },
      {
        className: 'A102',
        capacity: 40,
        location: 'Building A, First Floor',
        facilities: ['Projector', 'Whiteboard', 'WiFi']
      },
      {
        className: 'B201',
        capacity: 35,
        location: 'Building B, Second Floor',
        facilities: ['Projector', 'Whiteboard', 'WiFi', 'Computer Lab']
      },
      {
        className: 'B202',
        capacity: 30,
        location: 'Building B, Second Floor',
        facilities: ['Projector', 'Whiteboard', 'WiFi']
      },
      {
        className: 'C301',
        capacity: 60,
        location: 'Building C, Third Floor',
        facilities: ['Projector', 'Whiteboard', 'WiFi', 'Sound System']
      }
    ]);
    console.log('Classrooms created:', classes.length);

    console.log('\n✅ Seed data created successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@university.edu / admin123');
    console.log('Teacher: teacher1@university.edu / teacher123');
    console.log('Student: student1@university.edu / student123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

