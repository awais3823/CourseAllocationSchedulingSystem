const dotenv = require('dotenv');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');
const connectDB = require('../config/database');

dotenv.config();

const hasArg = (name) => process.argv.slice(2).includes(name);

const seedData = async () => {
  try {
    await connectDB();

    const force = hasArg('--force');

    if (force) {
      await User.deleteMany({});
      await Course.deleteMany({});
      await Class.deleteMany({});
      console.log('⚠️  Cleared existing data (--force enabled)');
    } else {
      console.log('ℹ️  Safe seed mode (no deletes). Use --force to wipe collections.');
    }

    // IMPORTANT:
    // Do NOT pre-hash passwords here because `User` model hashes on save.
    const adminPassword = 'admin123';
    const teacherPassword = 'teacher123';
    const studentPassword = 'student123';

    // Create Admin
    const adminEmail = 'admin@university.edu';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = await User.create({
        registrationNo: 'ADMIN001',
        email: adminEmail,
        password: adminPassword,
        name: 'System Administrator',
        role: 'admin'
      });
      console.log('Admin created:', admin.email);
    } else {
      console.log('Admin exists, skipped:', adminEmail);
    }

    // Create Teachers
    const teachersData = [
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
    ];
    let teachersCreated = 0;
    for (const t of teachersData) {
      const email = t.email.toLowerCase().trim();
      const reg = t.registrationNo.trim();
      const exists = await User.findOne({ $or: [{ email }, { registrationNo: reg }] });
      if (exists) continue;
      await User.create({ ...t, email, registrationNo: reg });
      teachersCreated += 1;
    }
    console.log('Teachers created:', teachersCreated);

    // Create Students
    const studentsData = [
      {
        registrationNo: 'S001',
        email: 'student1@university.edu',
        password: studentPassword,
        name: 'Alice Williams',
        role: 'student',
        semester: 3,
        program: 'Computer Science',
        degreeLevel: 'BS'
      },
      {
        registrationNo: 'S002',
        email: 'student2@university.edu',
        password: studentPassword,
        name: 'Bob Davis',
        role: 'student',
        semester: 3,
        program: 'Computer Science',
        degreeLevel: 'BS'
      },
      {
        registrationNo: 'S003',
        email: 'student3@university.edu',
        password: studentPassword,
        name: 'Charlie Miller',
        role: 'student',
        semester: 5,
        program: 'Software Engineering',
        degreeLevel: 'BS'
      }
    ];
    let studentsCreated = 0;
    for (const s of studentsData) {
      const email = s.email.toLowerCase().trim();
      const reg = s.registrationNo.trim();
      const exists = await User.findOne({ $or: [{ email }, { registrationNo: reg }] });
      if (exists) continue;
      await User.create({ ...s, email, registrationNo: reg });
      studentsCreated += 1;
    }
    console.log('Students created:', studentsCreated);

    // Create Courses
    const coursesData = [
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
        maxStudents: 30,
        description: 'Introduction to machine learning'
      }
    ];
    let coursesCreated = 0;
    for (const c of coursesData) {
      const exists = await Course.findOne({ $or: [{ courseId: c.courseId }, { courseCode: c.courseCode }] });
      if (exists) continue;
      await Course.create(c);
      coursesCreated += 1;
    }
    console.log('Courses created:', coursesCreated);

    // Create Classrooms
    const classesData = [
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
    ];
    let classesCreated = 0;
    for (const cl of classesData) {
      const exists = await Class.findOne({ className: cl.className });
      if (exists) continue;
      await Class.create(cl);
      classesCreated += 1;
    }
    console.log('Classrooms created:', classesCreated);

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: admin@university.edu / admin123');
    console.log('Teacher: teacher1@university.edu / teacher123');
    console.log('Student: student1@university.edu / student123');
    console.log('\nUsage:');
    console.log('  node scripts/seedData.js        # safe mode (no deletes)');
    console.log('  node scripts/seedData.js --force  # wipe collections, then seed');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

