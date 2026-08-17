const dotenv = require('dotenv');
const connectDB = require('../config/database');
const Course = require('../models/Course');

dotenv.config();

// Curriculum courses
const coursesData = [
  // Semester 1
  {
    courseId: 'EN-100',
    courseName: 'Functional English',
    courseCode: 'EN-100',
    credits: 3,
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Functional English'
  },
  {
    courseId: 'PK-100',
    courseName: 'Ideology & Constitution of Pakistan',
    courseCode: 'PK-100',
    credits: 2,
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Ideology & Constitution of Pakistan'
  },
  {
    courseId: 'MA-101',
    courseName: 'Calculus & Analytical Geometry',
    courseCode: 'MA-101',
    credits: 3,
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Calculus & Analytical Geometry'
  },
  {
    courseId: 'CSC-110',
    courseName: 'Applications of ICT',
    courseCode: 'CSC-110',
    credits: 3, // 2+1
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Applications of ICT'
  },
  {
    courseId: 'FQ-101',
    courseName: 'Understanding Quran-I',
    courseCode: 'FQ-101',
    credits: 1, // 0+1
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Understanding Quran-I'
  },
  {
    courseId: 'CSC-104',
    courseName: 'Problem Solving & Programming',
    courseCode: 'CSC-104',
    credits: 4, // 3+1
    semester: 1,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Problem Solving & Programming'
  },
  {
    courseId: 'CSC-121',
    courseName: 'Object Oriented Programming',
    courseCode: 'CSC-121',
    credits: 4, // 3+1
    semester: 2,
    program: 'Computer Science',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Object Oriented Programming'
  },

  // Semester 2
  {
    courseId: 'EN-200',
    courseName: 'Expository Writing',
    courseCode: 'EN-200',
    credits: 3,
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Expository Writing'
  },
  {
    courseId: 'IS-100',
    courseName: 'Islamic Studies / Ethics',
    courseCode: 'IS-100',
    credits: 2,
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Islamic Studies / Ethics'
  },
  {
    courseId: 'SS-201',
    courseName: 'Social Sciences Elective',
    courseCode: 'SS-201',
    credits: 2,
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Social Sciences Elective'
  },
  {
    courseId: 'PH-110',
    courseName: 'Introductory Mechanics and Waves',
    courseCode: 'PH-110',
    credits: 3,
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Introductory Mechanics and Waves'
  },
  {
    courseId: 'FQ-102',
    courseName: 'Understanding Quran-II',
    courseCode: 'FQ-102',
    credits: 1, // 0+1
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Understanding Quran-II'
  },
  {
    courseId: 'MA-202',
    courseName: 'Multivariable Calculus',
    courseCode: 'MA-202',
    credits: 3,
    semester: 2,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'MS - Multivariable Calculus'
  },

  // Semester 3
  {
    courseId: 'MA-203',
    courseName: 'Discrete Mathematics',
    courseCode: 'MA-203',
    credits: 3,
    semester: 3,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Discrete Mathematics'
  },
  {
    courseId: 'EN-299',
    courseName: 'Technical and Business Writing',
    courseCode: 'EN-299',
    credits: 3,
    semester: 3,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'MS - Technical and Business Writing'
  },
  {
    courseId: 'CSC-103',
    courseName: 'Introduction to Computer Org.',
    courseCode: 'CSC-103',
    credits: 3,
    semester: 3,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Introduction to Computer Organization'
  },
  {
    courseId: 'CSC-211',
    courseName: 'Data Structures',
    courseCode: 'CSC-211',
    credits: 4, // 3+1
    semester: 3,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Data Structures'
  },
  {
    courseId: 'CSC-212',
    courseName: 'Human Computer Interaction',
    courseCode: 'CSC-212',
    credits: 3,
    semester: 3,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Human Computer Interaction'
  },

  // Semester 4
  {
    courseId: 'SW-100',
    courseName: 'Civics and Community Engagement',
    courseCode: 'SW-100',
    credits: 2,
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Civics and Community Engagement'
  },
  {
    courseId: 'PS-101',
    courseName: 'Pakistan Studies',
    courseCode: 'PS-101',
    credits: 2,
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Pakistan Studies'
  },
  {
    courseId: 'MA-104',
    courseName: 'Fundamentals of Linear Algebra',
    courseCode: 'MA-104',
    credits: 3,
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'MS - Fundamentals of Linear Algebra'
  },
  {
    courseId: 'CSC-222',
    courseName: 'Analysis & Design of Software Systems',
    courseCode: 'CSC-222',
    credits: 3,
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Analysis & Design of Software Systems'
  },
  {
    courseId: 'CSC-224',
    courseName: 'Database Systems',
    courseCode: 'CSC-224',
    credits: 4, // 3+1
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Database Systems'
  },
  {
    courseId: 'CSC-313',
    courseName: 'Computer Architecture',
    courseCode: 'CSC-313',
    credits: 3,
    semester: 4,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Computer Architecture'
  },

  // Semester 5
  {
    courseId: 'ST-101',
    courseName: 'Probability and Statistics',
    courseCode: 'ST-101',
    credits: 3,
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'MS - Probability and Statistics'
  },
  {
    courseId: 'CSC-322',
    courseName: 'Software Construction',
    courseCode: 'CSC-322',
    credits: 3, // 2+1
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Software Construction'
  },
  {
    courseId: 'CSC-226',
    courseName: 'Operating Systems',
    courseCode: 'CSC-226',
    credits: 3, // 2+1
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Operating Systems'
  },
  {
    courseId: 'CSC-311',
    courseName: 'Analysis & Design of Algorithms',
    courseCode: 'CSC-311',
    credits: 3,
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Analysis & Design of Algorithms'
  },
  {
    courseId: 'CSC-414',
    courseName: 'Artificial Intelligence',
    courseCode: 'CSC-414',
    credits: 3,
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Artificial Intelligence'
  },
  {
    courseId: 'DE-501',
    courseName: 'Net Centric Programming',
    courseCode: 'DE-501',
    credits: 3,
    semester: 5,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Net Centric Programming'
  },

  // Semester 6
  {
    courseId: 'CSC-331',
    courseName: 'Theory of Automata',
    courseCode: 'CSC-331',
    credits: 3,
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Theory of Automata'
  },
  {
    courseId: 'CSC-325',
    courseName: 'Advanced Database Systems',
    courseCode: 'CSC-325',
    credits: 3, // 2+1
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Advanced Database Systems'
  },
  {
    courseId: 'CSC-215',
    courseName: 'Computer Org. & Assembly Language',
    courseCode: 'CSC-215',
    credits: 3, // 2+1
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Computer Organization & Assembly Language'
  },
  {
    courseId: 'CSC-312',
    courseName: 'Computer Communications & Networks',
    courseCode: 'CSC-312',
    credits: 3,
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Computer Communications & Networks'
  },
  {
    courseId: 'DE-602',
    courseName: 'Software Quality Assurance',
    courseCode: 'DE-602',
    credits: 3,
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Software Quality Assurance'
  },
  {
    courseId: 'DE-603',
    courseName: 'Computer Vision',
    courseCode: 'DE-603',
    credits: 3,
    semester: 6,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Computer Vision'
  },

  // Semester 7
  {
    courseId: 'MS-100',
    courseName: 'Entrepreneurship',
    courseCode: 'MS-100',
    credits: 2,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Entrepreneurship'
  },
  {
    courseId: 'AH-701',
    courseName: 'Arts and Humanities Elective',
    courseCode: 'AH-701',
    credits: 2,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'GE - Arts and Humanities Elective'
  },
  {
    courseId: 'CSC-411',
    courseName: 'Compiler Construction',
    courseCode: 'CSC-411',
    credits: 3,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DC - Compiler Construction'
  },
  {
    courseId: 'CSC-489',
    courseName: 'Project-I',
    courseCode: 'CSC-489',
    credits: 2,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Final Year Project I'
  },
  {
    courseId: 'DE-704',
    courseName: 'Web Application Framework',
    courseCode: 'DE-704',
    credits: 3,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Web Application Framework'
  },
  {
    courseId: 'DE-705',
    courseName: 'Data Mining',
    courseCode: 'DE-705',
    credits: 3,
    semester: 7,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Data Mining'
  },

  // Semester 8
  {
    courseId: 'ES-801',
    courseName: 'Cloud DevOps',
    courseCode: 'ES-801',
    credits: 3,
    semester: 8,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'ES - Cloud DevOps'
  },
  {
    courseId: 'CSC-412',
    courseName: 'Introduction to Cyber Security',
    courseCode: 'CSC-412',
    credits: 3,
    semester: 8,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Introduction to Cyber Security'
  },
  {
    courseId: 'CSC-490',
    courseName: 'Project-II',
    courseCode: 'CSC-490',
    credits: 4,
    semester: 8,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'CC - Final Year Project II'
  },
  {
    courseId: 'DE-806',
    courseName: 'Natural Language Processing',
    courseCode: 'DE-806',
    credits: 3,
    semester: 8,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Natural Language Processing'
  },
  {
    courseId: 'DE-807',
    courseName: 'Deep Learning',
    courseCode: 'DE-807',
    credits: 3,
    semester: 8,
    program: 'Software Engineering',
    degreeLevels: ['BS'],
    maxStudents: 60,
    description: 'DE - Deep Learning'
  }
];

const seedCurriculumCourses = async () => {
  try {
    await connectDB();

    // Note: we are NOT deleting existing courses here to avoid
    // removing any data you already have in the system.
    // If you want to clear all courses first, you can uncomment:
    // await Course.deleteMany({});
    // console.log('Cleared existing courses');

    const normalizedCoursesData = coursesData.map((c) => ({
      ...c,
      program: (c.program || '').toString().trim().replace(/\s+/g, ' ')
    }));

    const courses = await Course.insertMany(normalizedCoursesData);
    console.log(`✅ Inserted ${courses.length} curriculum courses`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding curriculum courses:', error);
    process.exit(1);
  }
};

seedCurriculumCourses();

