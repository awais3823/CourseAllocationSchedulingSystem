const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/database');

const User = require('../models/User');
const Course = require('../models/Course');
const Allocation = require('../models/Allocation');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');
const OverloadRequest = require('../models/OverloadRequest');
const ClassRoom = require('../models/Class');
const Timetable = require('../models/Timetable');
const ExamDatesheet = require('../models/ExamDatesheet');
const PendingUser = require('../models/PendingUser');

dotenv.config();

const hasArg = (name) => process.argv.slice(2).includes(name);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

const computeGrade = (marks) => {
  const m = typeof marks === 'number' ? marks : Number(marks);
  if (!Number.isFinite(m) || m < 0 || m > 100) return { grade: null, gradePoint: null };
  if (m >= 80) return { grade: 'A', gradePoint: 4.0 };
  if (m >= 76) return { grade: 'A-', gradePoint: 3.8 };
  if (m >= 72) return { grade: 'B+', gradePoint: 3.5 };
  if (m >= 68) return { grade: 'B', gradePoint: 3.0 };
  if (m >= 64) return { grade: 'B-', gradePoint: 2.8 };
  if (m >= 60) return { grade: 'C+', gradePoint: 2.5 };
  if (m >= 55) return { grade: 'C', gradePoint: 2.0 };
  if (m >= 50) return { grade: 'D', gradePoint: 1.0 };
  return { grade: 'F', gradePoint: 0 };
};

const normalizeProgram = (p) => (p || 'Software Engineering').toString().trim().replace(/\s+/g, ' ');

// Curriculum (aligned with your existing seedCurriculumCourses.js)
const CURRICULUM = [
  // Semester 1
  { courseId: 'EN-100', courseName: 'Functional English', courseCode: 'EN-100', credits: 3, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Functional English' },
  { courseId: 'PK-100', courseName: 'Ideology & Constitution of Pakistan', courseCode: 'PK-100', credits: 2, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Ideology & Constitution of Pakistan' },
  { courseId: 'MA-101', courseName: 'Calculus & Analytical Geometry', courseCode: 'MA-101', credits: 3, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Calculus & Analytical Geometry' },
  { courseId: 'CSC-110', courseName: 'Applications of ICT', courseCode: 'CSC-110', credits: 3, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Applications of ICT' },
  { courseId: 'FQ-101', courseName: 'Understanding Quran-I', courseCode: 'FQ-101', credits: 1, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Understanding Quran-I' },
  { courseId: 'CSC-104', courseName: 'Problem Solving & Programming', courseCode: 'CSC-104', credits: 4, semester: 1, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Problem Solving & Programming' },

  // Semester 2
  { courseId: 'EN-200', courseName: 'Expository Writing', courseCode: 'EN-200', credits: 3, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Expository Writing' },
  { courseId: 'IS-100', courseName: 'Islamic Studies / Ethics', courseCode: 'IS-100', credits: 2, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Islamic Studies / Ethics' },
  { courseId: 'SS-201', courseName: 'Social Sciences Elective', courseCode: 'SS-201', credits: 2, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Social Sciences Elective' },
  { courseId: 'PH-110', courseName: 'Introductory Mechanics and Waves', courseCode: 'PH-110', credits: 3, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Introductory Mechanics and Waves' },
  { courseId: 'FQ-102', courseName: 'Understanding Quran-II', courseCode: 'FQ-102', credits: 1, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Understanding Quran-II' },
  { courseId: 'MA-202', courseName: 'Multivariable Calculus', courseCode: 'MA-202', credits: 3, semester: 2, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'MS - Multivariable Calculus' },
  // Note: CSC-121 already exists in seeded curriculum; don't duplicate (courseId is unique).

  // Semester 3
  { courseId: 'MA-203', courseName: 'Discrete Mathematics', courseCode: 'MA-203', credits: 3, semester: 3, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Discrete Mathematics' },
  { courseId: 'EN-299', courseName: 'Technical and Business Writing', courseCode: 'EN-299', credits: 3, semester: 3, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'MS - Technical and Business Writing' },
  { courseId: 'CSC-103', courseName: 'Introduction to Computer Org.', courseCode: 'CSC-103', credits: 3, semester: 3, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Introduction to Computer Organization' },
  { courseId: 'CSC-211', courseName: 'Data Structures', courseCode: 'CSC-211', credits: 4, semester: 3, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Data Structures' },
  { courseId: 'CSC-212', courseName: 'Human Computer Interaction', courseCode: 'CSC-212', credits: 3, semester: 3, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Human Computer Interaction' },

  // Semester 4
  { courseId: 'SW-100', courseName: 'Civics and Community Engagement', courseCode: 'SW-100', credits: 2, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Civics and Community Engagement' },
  { courseId: 'PS-101', courseName: 'Pakistan Studies', courseCode: 'PS-101', credits: 2, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Pakistan Studies' },
  { courseId: 'MA-104', courseName: 'Fundamentals of Linear Algebra', courseCode: 'MA-104', credits: 3, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'MS - Fundamentals of Linear Algebra' },
  { courseId: 'CSC-222', courseName: 'Analysis & Design of Software Systems', courseCode: 'CSC-222', credits: 3, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Analysis & Design of Software Systems' },
  { courseId: 'CSC-224', courseName: 'Database Systems', courseCode: 'CSC-224', credits: 4, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Database Systems' },
  { courseId: 'CSC-313', courseName: 'Computer Architecture', courseCode: 'CSC-313', credits: 3, semester: 4, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Computer Architecture' },

  // Semester 5
  { courseId: 'ST-101', courseName: 'Probability and Statistics', courseCode: 'ST-101', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'MS - Probability and Statistics' },
  { courseId: 'CSC-322', courseName: 'Software Construction', courseCode: 'CSC-322', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Software Construction' },
  { courseId: 'CSC-226', courseName: 'Operating Systems', courseCode: 'CSC-226', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Operating Systems' },
  { courseId: 'CSC-311', courseName: 'Analysis & Design of Algorithms', courseCode: 'CSC-311', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Analysis & Design of Algorithms' },
  { courseId: 'CSC-414', courseName: 'Artificial Intelligence', courseCode: 'CSC-414', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Artificial Intelligence' },
  { courseId: 'DE-501', courseName: 'Net Centric Programming', courseCode: 'DE-501', credits: 3, semester: 5, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Net Centric Programming' },

  // Semester 6
  { courseId: 'CSC-331', courseName: 'Theory of Automata', courseCode: 'CSC-331', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Theory of Automata' },
  { courseId: 'CSC-325', courseName: 'Advanced Database Systems', courseCode: 'CSC-325', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Advanced Database Systems' },
  { courseId: 'CSC-215', courseName: 'Computer Org. & Assembly Language', courseCode: 'CSC-215', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Computer Organization & Assembly Language' },
  { courseId: 'CSC-312', courseName: 'Computer Communications & Networks', courseCode: 'CSC-312', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Computer Communications & Networks' },
  { courseId: 'DE-602', courseName: 'Software Quality Assurance', courseCode: 'DE-602', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Software Quality Assurance' },
  { courseId: 'DE-603', courseName: 'Computer Vision', courseCode: 'DE-603', credits: 3, semester: 6, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Computer Vision' },

  // Semester 7
  { courseId: 'MS-100', courseName: 'Entrepreneurship', courseCode: 'MS-100', credits: 2, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Entrepreneurship' },
  { courseId: 'AH-701', courseName: 'Arts and Humanities Elective', courseCode: 'AH-701', credits: 2, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'GE - Arts and Humanities Elective' },
  { courseId: 'CSC-411', courseName: 'Compiler Construction', courseCode: 'CSC-411', credits: 3, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DC - Compiler Construction' },
  { courseId: 'CSC-489', courseName: 'Project-I', courseCode: 'CSC-489', credits: 2, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Final Year Project I' },
  { courseId: 'DE-704', courseName: 'Web Application Framework', courseCode: 'DE-704', credits: 3, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Web Application Framework' },
  { courseId: 'DE-705', courseName: 'Data Mining', courseCode: 'DE-705', credits: 3, semester: 7, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Data Mining' },

  // Semester 8
  { courseId: 'ES-801', courseName: 'Cloud DevOps', courseCode: 'ES-801', credits: 3, semester: 8, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'ES - Cloud DevOps' },
  { courseId: 'CSC-412', courseName: 'Introduction to Cyber Security', courseCode: 'CSC-412', credits: 3, semester: 8, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Introduction to Cyber Security' },
  { courseId: 'CSC-490', courseName: 'Project-II', courseCode: 'CSC-490', credits: 4, semester: 8, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'CC - Final Year Project II' },
  { courseId: 'DE-806', courseName: 'Natural Language Processing', courseCode: 'DE-806', credits: 3, semester: 8, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Natural Language Processing' },
  { courseId: 'DE-807', courseName: 'Deep Learning', courseCode: 'DE-807', credits: 3, semester: 8, program: 'Software Engineering', degreeLevels: ['BS'], maxStudents: 60, description: 'DE - Deep Learning' }
];

// Keep teacher identities from seedQAUTeachers.js
const QAU_TEACHERS = [
  { name: 'Dr. Onaiza Maqbool', email: 'oniaza@qau.edu.pk' },
  { name: 'Dr. Ayyaz Hussain', email: 'ayyaz.hussain@qau.edu.pk' },
  { name: 'Dr. Muazzam A Khan Khattak', email: 'muazzam.khattak@qau.edu.pk' },
  { name: 'Dr. Rabeeh Ayaz Abbasi', email: 'rabbasi@qau.edu.pk' },
  { name: 'Dr. Muddassar Azam Sindhu', email: 'masindhu@qau.edu.pk' },
  { name: 'Dr. Ghazanfar Farooq Siddiqui', email: 'ghazanfar@qau.edu.pk' },
  { name: 'Dr. Khalid Saleem', email: 'ksaleem@qau.edu.pk' },
  { name: 'Dr. Umer Rasheed', email: 'umerrashid@qau.edu.pk' },
  { name: 'Dr. Akmal Saeed Khattak', email: 'akhattak@qau.edu.pk' },
  { name: 'Dr. Shuaib Karim', email: 'skarim@qau.edu.pk' },
  { name: 'Dr. S. M. Naqi', email: 'smnaqi@qau.edu.pk' },
  { name: 'Ms. Memoona Afsheen Malik', email: 'memoona@qau.edu.pk' },
  { name: 'Ms. Ifrah Farrukh Khan', email: 'ifrahkhan@qau.edu.pk' },
  { name: 'Dr. Muhammad Imran Khan', email: 'imran.khan@qau.edu.pk' },
  { name: 'Dr. Saima Akhtar', email: 'saima.akhtar@qau.edu.pk' },
  { name: 'Dr. Hassan Raza', email: 'hassan.raza@qau.edu.pk' },
  { name: 'Dr. Farah Mahmood', email: 'farah.mahmood@qau.edu.pk' },
  { name: 'Dr. Ali Ahmed', email: 'ali.ahmed@qau.edu.pk' },
  { name: 'Dr. Nadia Hussain', email: 'nadia.hussain@qau.edu.pk' },
  { name: 'Dr. Usman Malik', email: 'usman.malik@qau.edu.pk' },
  { name: 'Dr. Zainab Ali', email: 'zainab.ali@qau.edu.pk' },
  { name: 'Dr. Bilal Sheikh', email: 'bilal.sheikh@qau.edu.pk' },
  { name: 'Dr. Ayesha Khan', email: 'ayesha.khan@qau.edu.pk' }
];

// Pakistani name pool for demo students (more realistic)
const MALE_FIRST = [
  'Muhammad', 'Ahmed', 'Ali', 'Hassan', 'Hussain', 'Usman', 'Hamza', 'Saad', 'Abdullah', 'Bilal',
  'Ahsan', 'Fahad', 'Zubair', 'Talha', 'Huzaifa', 'Imran', 'Danish', 'Zain', 'Shahzaib', 'Sameer'
];
const FEMALE_FIRST = [
  'Ayesha', 'Fatima', 'Maryam', 'Zainab', 'Hira', 'Iqra', 'Sara', 'Noor', 'Maham', 'Anum',
  'Sana', 'Laiba', 'Eman', 'Khadija', 'Mehak', 'Areeba', 'Rabia', 'Hania', 'Sadia', 'Urooj'
];
const LAST_NAMES = [
  'Khan', 'Malik', 'Butt', 'Raza', 'Siddiqui', 'Abbasi', 'Shah', 'Sheikh', 'Hussain', 'Qureshi',
  'Rashid', 'Awan', 'Nawaz', 'Chaudhry', 'Javed', 'Iqbal', 'Yousaf', 'Mirza', 'Dar', 'Bhatti'
];

const makeName = () => {
  const isMale = Math.random() < 0.55;
  const first = isMale ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
  const last = pick(LAST_NAMES);
  // Common Pakistani multi-part given names
  const maybeSecond = isMale && Math.random() < 0.25 ? ` ${pick(['Ali', 'Hassan', 'Hussain', 'Raza', 'Ullah'])}` : '';
  return `${first}${maybeSecond} ${last}`.replace(/\s+/g, ' ').trim();
};
const makeStudentReg = (semester, idx) => `SE-DEMO-S${String(semester).padStart(2, '0')}-${String(idx).padStart(3, '0')}`;
const makeStudentEmail = (semester, idx) => `s${semester}.${idx}@demo.edu`;

const ensureAdmin = async () => {
  const email = 'admin@university.edu';
  const existing = await User.findOne({ email });
  if (existing) {
    // In case an old record exists with wrong role
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    return existing;
  }
  return await User.create({
    registrationNo: 'ADMIN001',
    email,
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin'
  });
};

const ensureTeachers = async () => {
  const existing = await User.find({ role: 'teacher' }).select('_id registrationNo email name');
  if (existing.length > 0) return existing;

  // If no teachers exist yet, create the QAU teacher list (same as seedQAUTeachers.js).
  // This does NOT delete or replace anyone; it only inserts missing teachers.
  const DEFAULT_PASSWORD = 'Abcd@123';
  for (const [i, t] of QAU_TEACHERS.entries()) {
    const registrationNo = `T${String(i + 1).padStart(3, '0')}`;
    const email = t.email.toLowerCase().trim();
    const name = t.name.trim();
    const exists = await User.findOne({ $or: [{ email }, { registrationNo }] });
    if (exists) continue;
    await User.create({ registrationNo, email, password: DEFAULT_PASSWORD, name, role: 'teacher' });
  }

  return await User.find({ role: 'teacher' }).select('_id registrationNo email name');
};

const ensureCourses = async () => {
  const existingCount = await Course.countDocuments();
  const normalized = CURRICULUM.map((c) => ({
    ...c,
    program: normalizeProgram(c.program)
  }));

  if (existingCount === 0) {
    await Course.insertMany(normalized, { ordered: false });
    return await Course.find().sort({ semester: 1, courseCode: 1 });
  }

  // Upsert by courseCode + semester + program to avoid duplicates across programs
  for (const c of normalized) {
    const query = { courseCode: c.courseCode, semester: c.semester, program: c.program };
    const found = await Course.findOne(query);
    if (!found) {
      await Course.create(c);
      continue;
    }
    // Keep existing but ensure critical fields present
    const patch = {};
    if (!found.courseId) patch.courseId = c.courseId || c.courseCode;
    if (!found.courseName) patch.courseName = c.courseName;
    if (!found.credits) patch.credits = c.credits;
    if (!found.maxStudents) patch.maxStudents = c.maxStudents;
    if (!Array.isArray(found.degreeLevels) || found.degreeLevels.length === 0) patch.degreeLevels = c.degreeLevels;
    if (Object.keys(patch).length > 0) {
      await Course.updateOne({ _id: found._id }, { $set: patch });
    }
  }

  return await Course.find().sort({ semester: 1, courseCode: 1 });
};

const ensureClasses = async () => {
  const existing = await ClassRoom.find().select('_id className capacity');
  if (existing.length >= 6) return existing;

  const defaults = [
    { className: 'A101', capacity: 60, location: 'Building A, First Floor', facilities: ['Projector', 'Whiteboard', 'WiFi'] },
    { className: 'A102', capacity: 60, location: 'Building A, First Floor', facilities: ['Projector', 'Whiteboard', 'WiFi'] },
    { className: 'B201', capacity: 45, location: 'Building B, Second Floor', facilities: ['Projector', 'Whiteboard', 'WiFi'] },
    { className: 'B202', capacity: 45, location: 'Building B, Second Floor', facilities: ['Projector', 'Whiteboard', 'WiFi'] },
    { className: 'C301', capacity: 80, location: 'Building C, Third Floor', facilities: ['Projector', 'Whiteboard', 'WiFi', 'Sound System'] },
    { className: 'LAB1', capacity: 35, location: 'Computer Lab', facilities: ['Computers', 'Projector', 'WiFi'] }
  ];

  for (const c of defaults) {
    const exists = await ClassRoom.findOne({ className: c.className });
    if (exists) continue;
    await ClassRoom.create(c);
  }

  return await ClassRoom.find().select('_id className capacity');
};

const normalizeNameKey = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const findTeacherIdByName = (teachers, desiredName) => {
  const target = normalizeNameKey(desiredName);
  if (!target) return null;

  // Exact-ish match
  const exact = teachers.find((t) => normalizeNameKey(t?.name) === target);
  if (exact) return exact._id;

  // Contains match (handles "Dr. Muazzam Khattak" vs "Dr. Muazzam A Khan Khattak")
  const contains = teachers.find((t) => normalizeNameKey(t?.name).includes(target) || target.includes(normalizeNameKey(t?.name)));
  if (contains) return contains._id;

  // Token overlap fallback
  const targetTokens = new Set(target.split(' ').filter(Boolean));
  let best = null;
  let bestScore = 0;
  for (const t of teachers) {
    const tokens = normalizeNameKey(t?.name).split(' ').filter(Boolean);
    const score = tokens.reduce((acc, tok) => acc + (targetTokens.has(tok) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return bestScore >= 2 ? best?._id : null;
};

// Course allocations from your screenshot (courseCode -> teacher name)
// If a course isn't listed here, it will be allocated randomly to an existing teacher.
const ALLOCATION_BY_COURSE_CODE = {
  // Semester I
  'CSC-104': 'Dr. Ghazanfar Farooq Siddiqui',

  // Semester II
  'EN-200': 'Ms. Tahira Shabir',
  'IS-100': 'Dr. Arshad Qayyum',
  'PH-110': 'Dr. Muhammad Shafiq',
  'MA-202': 'Ms. Farwa Haider',
  'CSC-121': 'Ms. Memoona Afsheen Malik',
  'FQ-102': 'Mr. Abdul Wahid',

  // Semester III
  'CSC-211': 'Dr. Rabeeh Ayaz Abbasi',

  // Semester IV (use the regular mapping as default)
  'SW-100': 'Dr. Nasreen Kousar',
  'MA-104': 'Dr. Waseem Siddiqui',
  'CSC-222': 'Dr. Onaiza Maqbool',
  'CSC-224': 'Dr. Khalid Saleem',
  'CSC-313': 'Ms. Ifrah Farrukh Khan',

  // Semester VI
  'CSC-325': 'Dr. Khalid Saleem',
  'CSC-331': 'Dr. Umer Rasheed',
  'CSC-312': 'Dr. Muazzam A Khan Khattak',
  'CSC-215': 'Ms. Ifrah Farrukh Khan',
  'DE-602': 'Dr. Muddassar Azam Sindhu',
  'DE-603': 'Dr. S. M. Naqi',

  // Semester VII
  'CSC-489': 'Dr. Adeel Ur Rehman',
  'DE-501': 'Dr. Muddassar Azam Sindhu',
  'CSC-411': 'Dr. Akmal Saeed Khattak',
  'DE-704': 'Dr. Akmal Saeed Khattak',
  'DE-705': 'Dr. Onaiza Maqbool',
  'DE-806': 'Dr. Nadia Hussain',

  // Semester VIII
  'CSC-490': 'Dr. Shuaib Karim',
  'CSC-412': 'Dr. Muazzam A Khan Khattak',
  'DE-807': 'Dr. Ayyaz Hussain'
};

const ensureAllocations = async ({ teachers, courses }) => {
  const existingAllocated = await Allocation.find({ status: 'allocated' }).select('courseId');
  const allocatedSet = new Set(existingAllocated.map((a) => a.courseId.toString()));

  const toCreate = [];
  for (const c of courses) {
    if (allocatedSet.has(c._id.toString())) continue;
    const courseCode = String(c.courseCode || '').toUpperCase().trim();
    const desiredTeacherName = ALLOCATION_BY_COURSE_CODE[courseCode];
    const mappedTeacherId = desiredTeacherName ? findTeacherIdByName(teachers, desiredTeacherName) : null;
    const teacherId = mappedTeacherId || pick(teachers)?._id;
    if (!teacherId) continue;
    toCreate.push({ teacherId, courseId: c._id, status: 'allocated', allocationDate: new Date() });
  }
  if (toCreate.length > 0) {
    await Allocation.insertMany(toCreate, { ordered: false });
  }
};

const createCompletedRegistration = async ({ studentId, course, attempt = 1, marks }) => {
  const gradeInfo = computeGrade(marks);
  return await Registration.create({
    studentId,
    courseId: course._id,
    attempt,
    status: 'completed',
    marks,
    grade: gradeInfo.grade,
    gradePoint: gradeInfo.gradePoint,
    evaluatedAt: new Date(Date.now() - randInt(2, 90) * 24 * 60 * 60 * 1000)
  });
};

const createRegistered = async ({ studentId, course, attempt }) => {
  return await Registration.create({
    studentId,
    courseId: course._id,
    attempt,
    status: 'registered',
    registrationDate: new Date(Date.now() - randInt(0, 10) * 24 * 60 * 60 * 1000)
  });
};

const sumCredits = (courses) =>
  (courses || []).reduce((sum, c) => sum + (typeof c?.credits === 'number' ? c.credits : Number(c?.credits) || 0), 0);

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const registerUpToCredits = async ({ studentId, courses, maxCredits, attemptByCourseId }) => {
  let total = 0;
  const picked = [];
  for (const c of shuffle(courses || [])) {
    const credits = typeof c?.credits === 'number' ? c.credits : Number(c?.credits) || 0;
    if (!credits) continue;
    if (total + credits > maxCredits) continue;
    const attempt = attemptByCourseId?.get?.(c._id.toString()) ?? 1;
    await createRegistered({ studentId, course: c, attempt });
    total += credits;
    picked.push(c);
  }
  return { picked, totalCredits: total };
};

const seedStudentsAndRegistrations = async ({ courses, admin }) => {
  const byCode = new Map(courses.map((c) => [String(c.courseCode).toUpperCase(), c]));
  const bySemester = new Map();
  for (const c of courses) {
    const sem = typeof c.semester === 'number' ? c.semester : Number(c.semester);
    if (!bySemester.has(sem)) bySemester.set(sem, []);
    bySemester.get(sem).push(c);
  }
  for (const [sem, list] of bySemester.entries()) {
    list.sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
    bySemester.set(sem, list);
  }

  const semesterCounts = new Map([
    [1, 50],
    [2, 40],
    [3, 30],
    [4, 24],
    [5, 7],
    [6, 7],
    [7, 7],
    [8, 7]
  ]);

  const PROGRAM = 'Software Engineering';
  const DEGREE = 'BS';
  const STUDENT_PASSWORD = 'student123';

  const createdStudents = [];
  for (const [semester, count] of semesterCounts.entries()) {
    for (let i = 1; i <= count; i++) {
      const registrationNo = makeStudentReg(semester, i);
      const email = makeStudentEmail(semester, i);
      const exists = await User.findOne({ $or: [{ email }, { registrationNo }] });
      if (exists) {
        createdStudents.push(exists);
        continue;
      }
      createdStudents.push(
        await User.create({
          registrationNo,
          email,
          password: STUDENT_PASSWORD,
          name: makeName(),
          role: 'student',
          semester,
          program: PROGRAM,
          degreeLevel: DEGREE
        })
      );
    }
  }

  // Helper: pick N distinct courses from a semester
  const pickSemesterCourses = (sem, n) => {
    const list = bySemester.get(sem) || [];
    if (list.length <= n) return list.slice();
    const chosen = new Set();
    while (chosen.size < n) chosen.add(pick(list)._id.toString());
    return list.filter((c) => chosen.has(c._id.toString()));
  };

  const cProg = byCode.get('CSC-104');
  const cOop = byCode.get('CSC-121');
  const cDs = byCode.get('CSC-211');

  if (!cProg || !cOop || !cDs) {
    throw new Error('Required courses missing: ensure CSC-104, CSC-121, CSC-211 exist');
  }

  // Create completed history for prior semesters, and current registrations.
  // Rules from your request are applied exactly.
  const bySemStudents = new Map();
  for (const s of createdStudents) {
    const sem = typeof s.semester === 'number' ? s.semester : Number(s.semester);
    if (!bySemStudents.has(sem)) bySemStudents.set(sem, []);
    bySemStudents.get(sem).push(s);
  }

  // Sem 1: register in semester 1 courses (no results yet)
  for (const s of bySemStudents.get(1) || []) {
    const currentCourses = pickSemesterCourses(1, 6);
    await registerUpToCredits({ studentId: s._id, courses: currentCourses, maxCredits: 18 });
  }

  // Sem 2: 40 students, 10 retake CSC-104 (registered) and NOT enrolled in OOP
  const sem2 = (bySemStudents.get(2) || []).slice();
  const sem2Retake = new Set(sem2.slice(0, 10).map((x) => x._id.toString()));
  for (const s of sem2) {
    // Completed semester 1 courses
    const sem1Courses = pickSemesterCourses(1, 6);
    for (const course of sem1Courses) {
      if (course.courseCode === 'CSC-104' && sem2Retake.has(s._id.toString())) {
        // fail/improve <60 so retake allowed
        await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(45, 59) });
      } else {
        await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(60, 90) });
      }
    }

    // Current semester registrations:
    if (sem2Retake.has(s._id.toString())) {
      // retake CSC-104 only, and do NOT register OOP
      await createRegistered({ studentId: s._id, course: cProg, attempt: 2 });
      // also register a few other semester 2 non-OOP courses to look realistic
      const sem2Courses = (bySemester.get(2) || []).filter((c) => c.courseCode !== 'CSC-121');
      await registerUpToCredits({ studentId: s._id, courses: sem2Courses.slice(0, 4), maxCredits: 18 });
    } else {
      const currentCourses = pickSemesterCourses(2, 6);
      await registerUpToCredits({ studentId: s._id, courses: currentCourses, maxCredits: 18 });
    }
  }

  // Sem 3: 30 students, 5 retake OOP and NOT enrolled in Data Structures
  const sem3 = (bySemStudents.get(3) || []).slice();
  const sem3OopRetake = new Set(sem3.slice(0, 5).map((x) => x._id.toString()));
  for (const s of sem3) {
    // Completed semesters 1-2
    for (const sem of [1, 2]) {
      const cs = pickSemesterCourses(sem, sem === 1 ? 6 : 6);
      for (const course of cs) {
        // For the 5 special students, fail OOP in sem2 so they can retake it in sem3
        if (sem === 2 && course.courseCode === 'CSC-121' && sem3OopRetake.has(s._id.toString())) {
          await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(40, 59) });
        } else {
          // also ensure each higher-sem student has at least one sem1 failed/improvement mark (<60)
          const forceSem1Low = sem === 1 && course.courseCode === 'CSC-104';
          if (forceSem1Low) {
            await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(50, 59) });
          } else {
            await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(60, 92) });
          }
        }
      }
    }

    // Current registrations
    if (sem3OopRetake.has(s._id.toString())) {
      await createRegistered({ studentId: s._id, course: cOop, attempt: 2 });
      // register some other sem3 courses, but NOT data structures
      const sem3CoursesNoDs = (bySemester.get(3) || []).filter((c) => c.courseCode !== 'CSC-211');
      await registerUpToCredits({ studentId: s._id, courses: sem3CoursesNoDs.slice(0, 4), maxCredits: 18 });
    } else {
      const currentCourses = pickSemesterCourses(3, 5);
      await registerUpToCredits({ studentId: s._id, courses: currentCourses, maxCredits: 18 });
    }
  }

  // Sem 4: 24 students registered in semester 4 courses (plus some backlogs)
  const sem4 = bySemStudents.get(4) || [];
  for (const s of sem4) {
    // Completed semesters 1-3
    for (const sem of [1, 2, 3]) {
      const cs = pickSemesterCourses(sem, sem === 3 ? 5 : 6);
      for (const course of cs) {
        const forceSem1Low = sem === 1 && course.courseCode === 'CSC-104';
        const marks = forceSem1Low ? randInt(45, 59) : randInt(60, 92);
        await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks });
      }
    }
    // Current: sem4
    const currentCourses = pickSemesterCourses(4, 6);
    await registerUpToCredits({ studentId: s._id, courses: currentCourses, maxCredits: 18 });
    // Optional backlog retake (50% chance)
    if (Math.random() < 0.5) {
      // Only add retake if it doesn't push registered credits beyond 18
      const currentCredits = await Registration.find({ studentId: s._id, status: 'registered' })
        .populate('courseId', 'credits')
        .then((regs) => regs.reduce((sum, r) => sum + (r.courseId?.credits || 0), 0));
      if (currentCredits + (cProg.credits || 0) <= 18) {
        await createRegistered({ studentId: s._id, course: cProg, attempt: 2 });
      }
    }
  }

  // Sem 5-8: 7 students each, each has complexity: current courses + failed/backlog from previous semesters
  for (const sem of [5, 6, 7, 8]) {
    const students = bySemStudents.get(sem) || [];
    for (const s of students) {
      // Completed history for all previous semesters
      for (let prev = 1; prev <= sem - 1; prev++) {
        const cs = pickSemesterCourses(prev, prev <= 2 ? 6 : 5);
        for (const course of cs) {
          // Ensure at least one semester-1 course is <60 for each of these students
          const forceSem1Low = prev === 1 && course.courseCode === 'CSC-104';
          const marks = forceSem1Low ? randInt(40, 59) : randInt(60, 93);
          await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks });
        }
      }

      // Current semester registrations
      const currentCourses = pickSemesterCourses(sem, sem >= 7 ? 5 : 6);
      await registerUpToCredits({ studentId: s._id, courses: currentCourses, maxCredits: 18 });

      // Add 1-2 backlog retakes (must be < current semester)
      const backlogCourses = [];
      backlogCourses.push(cProg); // ensures rule: 5/6/7/8 students register a sem1 course (retake)
      if (sem >= 6) backlogCourses.push(cOop);
      if (sem >= 7) backlogCourses.push(cDs);

      const toRetake = backlogCourses.slice(0, randInt(1, Math.min(2, backlogCourses.length)));
      for (const course of toRetake) {
        // Create a prior failed attempt if not already (attempt=1). Then register attempt=2.
        const prior = await Registration.findOne({ studentId: s._id, courseId: course._id, status: 'completed' });
        if (!prior) {
          await createCompletedRegistration({ studentId: s._id, course, attempt: 1, marks: randInt(35, 59) });
        }
        // Only register retake if it doesn't exceed 18 (without approval)
        const currentCredits = await Registration.find({ studentId: s._id, status: 'registered' })
          .populate('courseId', 'credits')
          .then((regs) => regs.reduce((sum, r) => sum + (r.courseId?.credits || 0), 0));
        if (currentCredits + (course.credits || 0) <= 18) {
          await createRegistered({ studentId: s._id, course, attempt: 2 });
        }
      }

      // Create 1 overload request (mixed status) for realism (sem6+)
      if (sem >= 6) {
        const reqCourse = pick(currentCourses);
        const currentCredits = await Registration.find({ studentId: s._id, status: 'registered' })
          .populate('courseId', 'credits')
          .then((regs) => regs.reduce((sum, r) => sum + (r.courseId?.credits || 0), 0));

        const requestedTotalCredits = currentCredits + (reqCourse.credits || 0);
        // Only create valid overload requests (19–21). Skip anything >21.
        if (requestedTotalCredits >= 19 && requestedTotalCredits <= 21) {
          const status = Math.random() < 0.5 ? 'pending' : 'approved';
          const exists = await OverloadRequest.findOne({ studentId: s._id, courseId: reqCourse._id, status });
          if (!exists) {
            await OverloadRequest.create({
              studentId: s._id,
              courseId: reqCourse._id,
              currentCredits,
              requestedTotalCredits,
              status,
              decisionBy: status === 'approved' ? admin._id : null,
              decisionDate: status === 'approved' ? new Date() : null
            });
          }
        }
      }
    }
  }

  return createdStudents;
};

const seedWaitlist = async ({ students, courses }) => {
  const target = courses.find((c) => String(c.courseCode).toUpperCase() === 'CSC-224') || courses[0];
  if (!target) return;

  // If registered count is already >= maxStudents, put 3 students on waitlist.
  const regsCount = await Registration.countDocuments({ courseId: target._id, status: 'registered' });
  if (regsCount < (target.maxStudents || 0)) {
    // artificially fill to capacity with fake regs (for waitlist demo)
    const need = Math.max(0, (target.maxStudents || 60) - regsCount);
    const fillStudents = students.slice(0, Math.min(need, students.length));
    for (const s of fillStudents) {
      const exists = await Registration.findOne({ studentId: s._id, courseId: target._id, status: 'registered' });
      if (!exists) {
        await Registration.create({ studentId: s._id, courseId: target._id, attempt: 1, status: 'registered' });
      }
    }
  }

  // Create waitlist entries (unique index enforced)
  const basePos = (await Waitlist.countDocuments({ courseId: target._id })) || 0;
  const waitStudents = students.slice(-10, -7);
  let pos = basePos + 1;
  for (const s of waitStudents) {
    const exists = await Waitlist.findOne({ studentId: s._id, courseId: target._id });
    if (exists) continue;
    await Waitlist.create({ studentId: s._id, courseId: target._id, position: pos++, notified: false });
  }
};

const seedPendingUsers = async ({ admin }) => {
  const candidates = [
    { registrationNo: 'PEND-STU-001', email: 'pending.student1@demo.edu', role: 'student' },
    { registrationNo: 'PEND-TEA-001', email: 'pending.teacher1@demo.edu', role: 'teacher' }
  ];
  for (const p of candidates) {
    const exists = await PendingUser.findOne({ email: p.email, registrationNo: p.registrationNo });
    if (exists) continue;
    await PendingUser.create({ ...p, addedBy: admin._id });
  }
};

const seedTimetable = async ({ courses, teachers, classes }) => {
  const academicYear = '2025-2026';
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [
    { startTime: '09:00', endTime: '10:30' },
    { startTime: '10:30', endTime: '12:00' },
    { startTime: '12:00', endTime: '13:30' },
    { startTime: '14:00', endTime: '15:30' },
    { startTime: '15:30', endTime: '17:00' }
  ];

  // Keep existing timetable; just top-up if empty
  const existing = await Timetable.countDocuments({ academicYear, status: 'active' });
  if (existing > 0) return;

  const allocations = await Allocation.find({ status: 'allocated' }).select('courseId teacherId');
  const teacherByCourse = new Map(allocations.map((a) => [a.courseId.toString(), a.teacherId]));

  const toCreate = [];
  for (const c of courses) {
    const teacherId = teacherByCourse.get(c._id.toString()) || pick(teachers)._id;
    const classId = pick(classes)._id;
    const day = pick(days);
    const slot = pick(slots);
    const sem = typeof c.semester === 'number' ? c.semester : Number(c.semester);
    if (!Number.isFinite(sem)) continue;
    toCreate.push({
      courseId: c._id,
      teacherId,
      classId,
      day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      semester: sem,
      academicYear,
      status: 'active'
    });
  }

  if (toCreate.length > 0) {
    await Timetable.insertMany(toCreate, { ordered: false });
  }
};

const seedExamDatesheet = async ({ courses, classes, students }) => {
  const existing = await ExamDatesheet.countDocuments();
  if (existing > 0) return;

  const allocations = await Allocation.find({ status: 'allocated' })
    .populate('teacherId', 'name')
    .select('courseId teacherId');
  const teacherNameByCourseId = new Map(
    allocations
      .filter((a) => a.courseId && a.teacherId)
      .map((a) => [a.courseId.toString(), a.teacherId?.name || 'TBA'])
  );

  const academicYear = '2025-2026';
  const startDate = new Date('2026-05-04T00:00:00.000Z');
  const endDate = new Date('2026-05-22T00:00:00.000Z');

  const sampleCourses = courses
    .filter((c) => [2, 3, 4, 5].includes(Number(c.semester)))
    .slice(0, 10);

  const entries = [];
  let d = new Date(startDate);
  const nextWeekday = () => {
    while (d.getDay() === 0 || d.getDay() === 6) d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const out = new Date(d);
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    return out;
  };

  for (const c of sampleCourses) {
    const classRoom = pick(classes);
    const examDate = nextWeekday();
    const timeSlot = Math.random() < 0.5 ? 'morning' : 'evening';
    const startTime = timeSlot === 'morning' ? '09:15' : '12:45';
    const endTime = timeSlot === 'morning' ? '12:15' : '15:45';

    // attach some students (by semester match, otherwise random)
    const sem = Number(c.semester);
    const eligible = students.filter((s) => Number(s.semester) >= sem);
    const selected = eligible.slice(0, randInt(10, 22)).map((s) => ({
      registrationNo: s.registrationNo,
      name: s.name,
      semester: Number(s.semester),
      program: s.program,
      degreeLevel: s.degreeLevel
    }));

    entries.push({
      courseCode: String(c.courseCode).toUpperCase(),
      courseName: c.courseName,
      semester: sem,
      program: c.program,
      degreeLevel: 'BS',
      teacherName: teacherNameByCourseId.get(c._id.toString()) || 'TBA',
      examDate,
      timeSlot,
      startTime,
      endTime,
      classId: classRoom._id,
      className: classRoom.className,
      classroomCapacity: classRoom.capacity,
      students: selected,
      totalStudents: selected.length
    });
  }

  const examId = 'EXAM-DEMO-2026';
  await ExamDatesheet.create({
    examId,
    academicYear,
    generatedFrom: 'system',
    examPeriod: { startDate, endDate },
    entries,
    conflicts: []
  });
};

const clearForDemo = async () => {
  // IMPORTANT: Do not wipe shared collections.
  // Only delete demo-generated rows (students @demo.edu / SE-DEMO-* and their related docs).

  const demoStudents = await User.find({
    role: 'student',
    $or: [
      { email: { $regex: /@demo\.edu$/i } },
      { registrationNo: { $regex: /^SE-DEMO-S/i } }
    ]
  }).select('_id');
  const demoStudentIds = demoStudents.map((s) => s._id);

  if (demoStudentIds.length > 0) {
    await Registration.deleteMany({ studentId: { $in: demoStudentIds } });
    await Waitlist.deleteMany({ studentId: { $in: demoStudentIds } });
    await OverloadRequest.deleteMany({ studentId: { $in: demoStudentIds } });
  }

  // Timetable + datesheet created by this demo script only
  await Timetable.deleteMany({ academicYear: '2025-2026' });
  await ExamDatesheet.deleteMany({ examId: { $regex: /^EXAM-DEMO-/i } });

  // Demo pending users only
  await PendingUser.deleteMany({
    $or: [
      { email: { $regex: /@demo\.edu$/i } },
      { registrationNo: { $regex: /^PEND-/i } }
    ]
  });

  // Finally remove demo students themselves
  if (demoStudentIds.length > 0) {
    await User.deleteMany({ _id: { $in: demoStudentIds } });
  }
};

const ensureRegistrationIndexes = async () => {
  // Some environments previously created a unique index on (studentId, courseId) only,
  // which breaks the intended multi-attempt design (studentId, courseId, attempt).
  // If present, drop it so seeding + retakes work.
  try {
    const idx = await Registration.collection.indexes();
    const bad = idx.find((i) => i?.name === 'studentId_1_courseId_1' && i?.unique === true);
    if (bad) {
      await Registration.collection.dropIndex('studentId_1_courseId_1');
      console.log('🔧 Dropped outdated index registrations.studentId_1_courseId_1');
    }
  } catch (e) {
    // Ignore if collection/index does not exist yet
  }

  // Ensure the intended compound unique index exists
  try {
    await Registration.syncIndexes();
  } catch (e) {
    // best-effort
  }
};

const seedDemo = async () => {
  await connectDB();

  await ensureRegistrationIndexes();

  const force = hasArg('--force');
  if (force) {
    await clearForDemo();
    console.log('⚠️  Cleared demo data (--force enabled)');
  } else {
    console.log('ℹ️  Safe demo seed mode (no destructive deletes). Use --force to reset demo data.');
  }

  const admin = await ensureAdmin();
  const teachers = await ensureTeachers();
  const courses = await ensureCourses();
  const classes = await ensureClasses();

  await ensureAllocations({ teachers, courses });
  const students = await seedStudentsAndRegistrations({ courses, admin });

  await seedWaitlist({ students, courses });
  await seedPendingUsers({ admin });
  await seedTimetable({ courses, teachers, classes });
  await seedExamDatesheet({ courses, classes, students });

  console.log('\n✅ Demo seed completed successfully!\n');
  console.log('Login credentials (demo):');
  console.log('  Admin:   admin@university.edu / admin123');
  console.log('  Teacher: oniaza@qau.edu.pk / Abcd@123');
  console.log('  Student: s1.1@demo.edu / student123   (Semester 1 example)');
  console.log('  Student: s8.1@demo.edu / student123   (Semester 8 example)');
  console.log('\nUsage:');
  console.log('  node scripts/seedDemoData.js');
  console.log('  node scripts/seedDemoData.js --force');
};

seedDemo()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  });

