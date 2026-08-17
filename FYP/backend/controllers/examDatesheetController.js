const mongoose = require('mongoose');
const XLSX = require('xlsx');
const ExamDatesheet = require('../models/ExamDatesheet');
const Registration = require('../models/Registration');
const Allocation = require('../models/Allocation');
const { generateExamSchedule } = require('../utils/examScheduler');

// Expected Excel header names (case-insensitive trim)
const REQUIRED_COLUMNS = [
  'Student Registration No',
  'Student Name',
  'Course Code',
  'Course Name',
  'Semester',
  'Teacher Name',
  'Program',
  'Degree Level'
];

const normalizeHeader = (header) =>
  String(header || '')
    .trim()
    .toLowerCase();

// Map normalized header -> canonical name
const buildHeaderMap = (firstRow) => {
  const map = {};

  Object.keys(firstRow || {}).forEach((key) => {
    const normalized = normalizeHeader(key);
    map[normalized] = key;
  });

  return map;
};

const findHeaderKey = (headerMap, label) => {
  const target = normalizeHeader(label);
  const direct = headerMap[target];
  if (direct) return direct;

  // Try more permissive matching (e.g. "student_reg_no")
  const entry = Object.entries(headerMap).find(([norm]) => norm.includes(target));
  return entry ? entry[1] : null;
};

// Parse Excel buffer into internal exam structures
const parseExcelToExams = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (!rows || rows.length === 0) {
    throw new Error('Excel file is empty or has no valid data');
  }

  const headerMap = buildHeaderMap(rows[0]);

  // Validate required columns exist
  const missing = REQUIRED_COLUMNS.filter((label) => !findHeaderKey(headerMap, label));
  if (missing.length > 0) {
    throw new Error(`Missing required columns in Excel: ${missing.join(', ')}`);
  }

  const studentMap = {}; // regNo -> { registrationNo, name, program, degreeLevel, courses: [...] }
  const courseMap = {}; // courseCode -> exam object

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRowNumber = i + 2; // +2 for header and 1-based indexing

    const get = (label) => {
      const key = findHeaderKey(headerMap, label);
      return key ? row[key] : undefined;
    };

    const registrationNo = String(get('Student Registration No') || '').trim();
    const studentName = String(get('Student Name') || '').trim();
    const courseCode = String(get('Course Code') || '').trim().toUpperCase();
    const courseName = String(get('Course Name') || '').trim();
    const semesterRaw = get('Semester');
    const teacherName = String(get('Teacher Name') || '').trim();
    const program = String(get('Program') || '').trim();
    const degreeLevel = String(get('Degree Level') || '').trim();

    if (!registrationNo || !studentName || !courseCode || !courseName) {
      // Skip incomplete rows but could also push to a warnings list if needed
      // For now, throw an error to force clean input
      throw new Error(`Missing required data at Excel row ${excelRowNumber}`);
    }

    const semester = semesterRaw ? parseInt(semesterRaw, 10) : undefined;

    if (Number.isNaN(semester)) {
      throw new Error(`Invalid semester value at Excel row ${excelRowNumber}`);
    }

    if (!studentMap[registrationNo]) {
      studentMap[registrationNo] = {
        registrationNo,
        name: studentName,
        program,
        degreeLevel,
        courses: []
      };
    }

    studentMap[registrationNo].courses.push({
      courseCode,
      courseName,
      semester,
      teacherName,
      program,
      degreeLevel
    });

    if (!courseMap[courseCode]) {
      courseMap[courseCode] = {
        courseCode,
        courseName,
        semester,
        program,
        degreeLevel,
        teacherName,
        students: []
      };
    }
  }

  // Attach students to each course
  Object.values(studentMap).forEach((student) => {
    const baseStudentInfo = {
      registrationNo: student.registrationNo,
      name: student.name,
      program: student.program,
      degreeLevel: student.degreeLevel
    };

    student.courses.forEach((course) => {
      const exam = courseMap[course.courseCode];
      if (!exam) return;

      exam.students.push({
        ...baseStudentInfo,
        semester: course.semester
      });
    });
  });

  return {
    exams: Object.values(courseMap),
    students: Object.values(studentMap)
  };
};

const filterWeekendEntries = (entries) => {
  const isWeekend = (d) => {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  };
  return (entries || []).filter((e) => !isWeekend(e.examDate));
};

/**
 * Build exam payloads for the scheduler from DB: active registrations + teacher allocations.
 * @param {{ semester?: string|number, program?: string, degreeLevel?: string }} filters
 */
const buildExamsFromDatabase = async (filters = {}) => {
  const { semester, program, degreeLevel } = filters;

  const registrations = await Registration.find({ status: 'registered' })
    .populate({
      path: 'studentId',
      select: 'name registrationNo role program degreeLevel semester'
    })
    .populate({
      path: 'courseId',
      select: 'courseCode courseName semester program degreeLevels maxStudents'
    });

  let filtered = registrations.filter(
    (r) =>
      r.studentId &&
      r.courseId &&
      r.studentId.role === 'student' &&
      r.courseId.courseCode
  );

  if (semester !== undefined && semester !== null && String(semester).trim() !== '') {
    const sem = parseInt(String(semester), 10);
    if (!Number.isNaN(sem)) {
      filtered = filtered.filter((r) => r.courseId.semester === sem);
    }
  }

  if (program && String(program).trim()) {
    const p = String(program).trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        String(r.courseId.program || '').toLowerCase() === p ||
        String(r.studentId.program || '').toLowerCase() === p
    );
  }

  if (degreeLevel && String(degreeLevel).trim()) {
    const dl = String(degreeLevel).trim();
    filtered = filtered.filter((r) => {
      const courseLevels = r.courseId.degreeLevels || [];
      const matchesStudent = r.studentId.degreeLevel === dl;
      if (!matchesStudent) return false;
      if (courseLevels.length === 0) return true;
      return courseLevels.includes(dl);
    });
  }

  const uniqueCourseIds = [...new Set(filtered.map((r) => r.courseId._id.toString()))].map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const allocations =
    uniqueCourseIds.length > 0
      ? await Allocation.find({
          courseId: { $in: uniqueCourseIds },
          status: 'allocated'
        }).populate({ path: 'teacherId', select: 'name' })
      : [];

  const teacherByCourseId = new Map();
  for (const alloc of allocations) {
    const cid = alloc.courseId.toString();
    if (!teacherByCourseId.has(cid)) {
      teacherByCourseId.set(cid, (alloc.teacherId && alloc.teacherId.name) || 'UNASSIGNED');
    }
  }

  const courseMap = {};
  const missingTeacherWarned = new Set();
  const extraWarnings = [];

  for (const reg of filtered) {
    const student = reg.studentId;
    const course = reg.courseId;
    const code = String(course.courseCode).trim().toUpperCase();
    const cid = course._id.toString();
    let teacherName = teacherByCourseId.get(cid);
    if (!teacherName) {
      teacherName = 'UNASSIGNED';
    }

    if (!courseMap[code]) {
      const deg =
        (course.degreeLevels && course.degreeLevels[0]) || student.degreeLevel || '';
      courseMap[code] = {
        courseCode: code,
        courseName: course.courseName,
        semester: course.semester,
        program: course.program || student.program,
        degreeLevel: deg,
        teacherName,
        students: []
      };

      if (teacherName === 'UNASSIGNED' && !missingTeacherWarned.has(code)) {
        missingTeacherWarned.add(code);
        extraWarnings.push({
          type: 'teacher',
          severity: 'warning',
          message: `No allocated teacher for course ${code} (${course.courseName}). Using UNASSIGNED until a teacher is allocated.`
        });
      }
    }

    const exists = courseMap[code].students.some((s) => s.registrationNo === student.registrationNo);
    if (!exists) {
      courseMap[code].students.push({
        registrationNo: student.registrationNo,
        name: student.name,
        program: student.program,
        degreeLevel: student.degreeLevel,
        semester: course.semester
      });
    }
  }

  const exams = Object.values(courseMap).filter((e) => e.students.length > 0);
  return { exams, warnings: extraWarnings };
};

const persistGeneratedDatesheet = async ({
  schedule,
  startDate,
  endDate,
  generatedFrom,
  examId,
  academicYear,
  excelMeta,
  extraConflicts = []
}) => {
  const startDateObj = new Date(startDate);
  const year = startDateObj.getFullYear();
  const defaultAY = `${year}-${year + 1}`;

  const payload = {
    examId,
    academicYear: academicYear || defaultAY,
    generatedFrom,
    examPeriod: {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    },
    entries: filterWeekendEntries(schedule.entries),
    conflicts: [...(schedule.conflicts || []), ...extraConflicts]
  };

  if (excelMeta) {
    payload.excelMeta = excelMeta;
  }

  return ExamDatesheet.create(payload);
};

const SLOT_TIMES = {
  morning: { startTime: '09:15', endTime: '12:15' },
  evening: { startTime: '12:45', endTime: '15:45' }
};

const toDateKey = (d) => new Date(d).toISOString().slice(0, 10);

const computeDatesheetConflicts = (entries) => {
  const conflicts = [];
  const teacherBySlot = {};
  const studentByDay = {};
  const classSlot = {};

  for (const entry of entries || []) {
    const dateKey = toDateKey(entry.examDate);
    const slot = entry.timeSlot === 'evening' ? 'evening' : 'morning';
    const teacher = entry.teacherName || 'UNKNOWN';
    const className = entry.className || 'UNASSIGNED';
    const classKey = `${className}::${dateKey}::${slot}`;
    classSlot[classKey] = (classSlot[classKey] || 0) + 1;

    const teacherKey = `${teacher}::${dateKey}::${slot}`;
    teacherBySlot[teacherKey] = (teacherBySlot[teacherKey] || 0) + 1;

    if (!studentByDay[dateKey]) studentByDay[dateKey] = {};
    for (const s of entry.students || []) {
      const reg = s.registrationNo || 'UNKNOWN';
      if (!studentByDay[dateKey][reg]) studentByDay[dateKey][reg] = [];
      studentByDay[dateKey][reg].push({ ...entry, _student: s });
    }

    const count = Number(entry.totalStudents ?? (entry.students || []).length);
    const cap = Number(entry.classroomCapacity || 0);
    if (cap > 0 && count > cap) {
      conflicts.push({
        type: 'classroom',
        severity: 'warning',
        message: `Classroom capacity exceeded for ${entry.courseCode} on ${dateKey} ${slot}`,
        details: { courseCode: entry.courseCode, date: dateKey, timeSlot: slot, classroom: className, capacity: cap, students: count }
      });
    }
  }

  Object.entries(teacherBySlot).forEach(([k, n]) => {
    if (n > 1) {
      const [teacher, dateKey, slot] = k.split('::');
      conflicts.push({
        type: 'teacher',
        severity: 'critical',
        isScheduleClash: true,
        message: `Teacher ${teacher} has ${n} exams in ${slot} on ${dateKey}.`
      });
    }
  });

  Object.entries(studentByDay).forEach(([dateKey, students]) => {
    Object.entries(students).forEach(([reg, exams]) => {
      const slotCounts = exams.reduce((acc, e) => {
        const k = e.timeSlot;
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const clashSlot = Object.keys(slotCounts).find((s) => slotCounts[s] > 1);
      if (clashSlot) {
        conflicts.push({
          type: 'student',
          severity: 'critical',
          isScheduleClash: true,
          message: `Student ${reg} has two exams in the same time slot (${clashSlot}) on ${dateKey}.`
        });
      }
    });
  });

  Object.entries(classSlot).forEach(([k, n]) => {
    if (n > 1) {
      const [className, dateKey, slot] = k.split('::');
      conflicts.push({
        type: 'classroom',
        severity: 'critical',
        message: `Classroom ${className} has ${n} exams on ${dateKey} ${slot}.`
      });
    }
  });

  return conflicts;
};

const validateEntriesRules = (entries) => {
  const teacherBySlot = {};
  const classBySlot = {};
  const studentDaySlots = {};

  for (const entry of entries || []) {
    const dateKey = toDateKey(entry.examDate);
    const slot = entry.timeSlot === 'evening' ? 'evening' : 'morning';
    const teacher = entry.teacherName || 'UNKNOWN';
    const className = entry.className || 'UNASSIGNED';

    const tKey = `${teacher}::${dateKey}::${slot}`;
    teacherBySlot[tKey] = (teacherBySlot[tKey] || 0) + 1;
    if (teacherBySlot[tKey] > 1) {
      return { valid: false, message: `Teacher ${teacher} already has an exam in ${slot} on ${dateKey}.` };
    }

    const cKey = `${className}::${dateKey}::${slot}`;
    classBySlot[cKey] = (classBySlot[cKey] || 0) + 1;
    if (classBySlot[cKey] > 1) {
      return { valid: false, message: `Classroom ${className} is already occupied on ${dateKey} ${slot}.` };
    }

    for (const s of entry.students || []) {
      const reg = s.registrationNo || 'UNKNOWN';
      const k = `${reg}::${dateKey}`;
      if (!studentDaySlots[k]) studentDaySlots[k] = new Set();
      if (studentDaySlots[k].has(slot)) {
        return { valid: false, message: `Student ${reg} already has an exam in ${slot} on ${dateKey}.` };
      }
      studentDaySlots[k].add(slot);
      if (studentDaySlots[k].size > 2) {
        return { valid: false, message: `Student ${reg} cannot have more than two exams in one day.` };
      }
    }
  }

  return { valid: true };
};

// POST /api/exam-datesheets/generate-from-excel
// Body: { academicYear, startDate, endDate }
// File: form-data "file"
exports.generateFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const parsed = parseExcelToExams(req.file.buffer);

    const schedule = await generateExamSchedule(parsed.exams, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      excludeWeekends: true // Exams cannot be on Saturday or Sunday
    });

    const startDateObj = new Date(startDate);
    const year = startDateObj.getFullYear();
    const academicYear = `${year}-${year + 1}`;
    const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(startDateObj.getDate()).padStart(2, '0');
    const examId = `EXAM-${year}-${month}-${day}`;

    const datesheet = await persistGeneratedDatesheet({
      schedule,
      startDate,
      endDate,
      generatedFrom: 'excel',
      examId,
      academicYear,
      excelMeta: {
        originalName: req.file.originalname,
        uploadedBy: req.user ? req.user.id : null,
        uploadedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Exam datesheet generated successfully from Excel',
      datesheet
    });
  } catch (error) {
    console.error('Error generating exam datesheet from Excel:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate exam datesheet from Excel'
    });
  }
};

// POST /api/exam-datesheets/generate-from-system
// Body: { startDate, endDate, academicYear?, semester?, program?, degreeLevel? }
exports.generateFromSystem = async (req, res) => {
  try {
    const { startDate, endDate, academicYear, semester, program, degreeLevel } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const { exams, warnings } = await buildExamsFromDatabase({
      semester,
      program,
      degreeLevel
    });

    if (!exams.length) {
      return res.status(400).json({
        success: false,
        message:
          'No exam candidates found. Add course registrations (status: registered) matching your filters, and ensure courses exist.'
      });
    }

    const schedule = await generateExamSchedule(exams, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      excludeWeekends: true
    });

    const examId = `EXAM-DB-${Date.now()}`;
    const ay =
      academicYear && String(academicYear).trim()
        ? String(academicYear).trim()
        : undefined;

    const datesheet = await persistGeneratedDatesheet({
      schedule,
      startDate,
      endDate,
      generatedFrom: 'system',
      examId,
      academicYear: ay,
      extraConflicts: warnings
    });

    res.status(201).json({
      success: true,
      message: 'Exam datesheet generated successfully from system data',
      datesheet,
      meta: {
        coursesScheduled: exams.length,
        registrationRowsUsed: exams.reduce((n, e) => n + (e.students?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error generating exam datesheet from system:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate exam datesheet from system data'
    });
  }
};

// GET /api/exam-datesheets
exports.getAllDatesheets = async (req, res) => {
  try {
    const datesheets = await ExamDatesheet.find()
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: datesheets.length,
      datesheets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/exam-datesheets/:id
// Returns datesheet plus derived student/course/teacher/classroom views
exports.getDatesheetById = async (req, res) => {
  try {
    const datesheet = await ExamDatesheet.findById(req.params.id);

    if (!datesheet) {
      return res.status(404).json({
        success: false,
        message: 'Exam datesheet not found'
      });
    }

    const studentSchedules = {};
    const courseSchedules = {};
    const teacherSchedules = {};
    const classroomSchedules = {};

    (datesheet.entries || []).forEach((entry) => {
      const date = entry.examDate;
      const dateKey = date ? new Date(date).toISOString().slice(0, 10) : null;

      // Course-wise
      if (!courseSchedules[entry.courseCode]) {
        courseSchedules[entry.courseCode] = [];
      }
      courseSchedules[entry.courseCode].push({
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        date: dateKey,
        timeSlot: entry.timeSlot,
        startTime: entry.startTime,
        endTime: entry.endTime,
        className: entry.className,
        teacherName: entry.teacherName,
        totalStudents: entry.totalStudents
      });

      // Teacher-wise
      const teacherKey = entry.teacherName || 'UNKNOWN';
      if (!teacherSchedules[teacherKey]) {
        teacherSchedules[teacherKey] = [];
      }
      teacherSchedules[teacherKey].push({
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        date: dateKey,
        timeSlot: entry.timeSlot,
        startTime: entry.startTime,
        endTime: entry.endTime,
        className: entry.className,
        totalStudents: entry.totalStudents
      });

      // Classroom-wise
      const classKey = entry.className || 'UNASSIGNED';
      if (!classroomSchedules[classKey]) {
        classroomSchedules[classKey] = [];
      }
      classroomSchedules[classKey].push({
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        date: dateKey,
        timeSlot: entry.timeSlot,
        startTime: entry.startTime,
        endTime: entry.endTime,
        teacherName: entry.teacherName,
        totalStudents: entry.totalStudents
      });

      // Student-wise
      (entry.students || []).forEach((student) => {
        const regNo = student.registrationNo || 'UNKNOWN';
        if (!studentSchedules[regNo]) {
          studentSchedules[regNo] = {
            registrationNo: regNo,
            name: student.name,
            exams: []
          };
        }
        studentSchedules[regNo].exams.push({
          courseCode: entry.courseCode,
          courseName: entry.courseName,
          date: dateKey,
          timeSlot: entry.timeSlot,
          startTime: entry.startTime,
          endTime: entry.endTime,
          className: entry.className,
          teacherName: entry.teacherName,
          semester: student.semester,
          program: student.program,
          degreeLevel: student.degreeLevel
        });
      });
    });

    res.json({
      success: true,
      datesheet,
      views: {
        studentSchedules,
        courseSchedules,
        teacherSchedules,
        classroomSchedules
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT /api/exam-datesheets/:id/move-entry
// Body: { entryIndex, targetDate, timeSlot }
exports.moveDatesheetEntry = async (req, res) => {
  try {
    const { entryIndex, targetDate, timeSlot } = req.body || {};
    const idx = Number(entryIndex);
    const slot = timeSlot === 'evening' ? 'evening' : timeSlot === 'morning' ? 'morning' : null;

    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Valid entryIndex is required' });
    }
    if (!targetDate || Number.isNaN(new Date(targetDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid targetDate is required' });
    }
    if (!slot) {
      return res.status(400).json({ success: false, message: 'timeSlot must be morning or evening' });
    }

    const target = new Date(targetDate);
    const day = target.getDay();
    if (day === 0 || day === 6) {
      return res.status(400).json({ success: false, message: 'Exams cannot be moved to Saturday or Sunday.' });
    }

    const datesheet = await ExamDatesheet.findById(req.params.id);
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Exam datesheet not found' });
    }
    if (!datesheet.entries || !datesheet.entries[idx]) {
      return res.status(404).json({ success: false, message: 'Entry not found at provided index' });
    }

    const entries = (datesheet.entries || []).map((e) => (e.toObject ? e.toObject() : { ...e }));
    entries[idx] = {
      ...entries[idx],
      examDate: target,
      timeSlot: slot,
      startTime: SLOT_TIMES[slot].startTime,
      endTime: SLOT_TIMES[slot].endTime
    };

    const rules = validateEntriesRules(entries);
    if (!rules.valid) {
      return res.status(400).json({ success: false, message: rules.message });
    }

    datesheet.entries = entries;
    datesheet.conflicts = computeDatesheetConflicts(entries);
    await datesheet.save();

    res.json({
      success: true,
      message: 'Exam moved successfully',
      datesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/exam-datesheets/:id/entry
// Body: { courseCode, courseName, semester?, program?, degreeLevel?, teacherName?, examDate, timeSlot, className?, classroomCapacity? }
exports.addDatesheetEntry = async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      semester,
      program,
      degreeLevel,
      teacherName,
      examDate,
      timeSlot,
      className,
      classroomCapacity
    } = req.body || {};

    const code = courseCode != null ? String(courseCode).trim().toUpperCase() : '';
    const name = courseName != null ? String(courseName).trim() : '';
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'courseCode and courseName are required' });
    }

    const slot = timeSlot === 'evening' ? 'evening' : timeSlot === 'morning' ? 'morning' : null;
    if (!slot) {
      return res.status(400).json({ success: false, message: 'timeSlot must be morning or evening' });
    }
    if (!examDate || Number.isNaN(new Date(examDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Valid examDate is required' });
    }

    const examD = new Date(examDate);
    const dow = examD.getDay();
    if (dow === 0 || dow === 6) {
      return res.status(400).json({
        success: false,
        message: 'Exam date cannot be Saturday or Sunday.'
      });
    }

    const datesheet = await ExamDatesheet.findById(req.params.id);
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Exam datesheet not found' });
    }

    const newEntry = {
      courseCode: code,
      courseName: name,
      teacherName: teacherName != null ? String(teacherName).trim() : '',
      className: className != null ? String(className).trim() : '',
      program: program != null && String(program).trim() ? String(program).trim() : undefined,
      degreeLevel: degreeLevel != null && String(degreeLevel).trim() ? String(degreeLevel).trim() : undefined,
      examDate: examD,
      timeSlot: slot,
      startTime: SLOT_TIMES[slot].startTime,
      endTime: SLOT_TIMES[slot].endTime,
      students: [],
      totalStudents: 0
    };

    if (semester !== undefined && semester !== null && String(semester).trim() !== '') {
      const s = parseInt(String(semester), 10);
      if (!Number.isNaN(s)) newEntry.semester = s;
    }
    if (classroomCapacity !== undefined && classroomCapacity !== null && String(classroomCapacity).trim() !== '') {
      const c = parseInt(String(classroomCapacity), 10);
      if (!Number.isNaN(c)) newEntry.classroomCapacity = c;
    }

    const entries = [...(datesheet.entries || []).map((e) => (e.toObject ? e.toObject() : { ...e })), newEntry];

    const rules = validateEntriesRules(entries);
    if (!rules.valid) {
      return res.status(400).json({ success: false, message: rules.message });
    }

    datesheet.entries = entries;
    datesheet.conflicts = computeDatesheetConflicts(entries);
    await datesheet.save();

    res.status(201).json({
      success: true,
      message: 'Exam entry added successfully',
      datesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/exam-datesheets/:id/entry
// Body: { entryIndex, courseCode?, courseName?, semester?, program?, degreeLevel?, teacherName?, examDate?, timeSlot?, className?, classroomCapacity? }
exports.updateDatesheetEntry = async (req, res) => {
  try {
    const idx = Number(req.body.entryIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Valid entryIndex is required' });
    }

    const {
      courseCode,
      courseName,
      semester,
      program,
      degreeLevel,
      teacherName,
      examDate,
      timeSlot,
      className,
      classroomCapacity
    } = req.body || {};

    const datesheet = await ExamDatesheet.findById(req.params.id);
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Exam datesheet not found' });
    }
    if (!datesheet.entries || !datesheet.entries[idx]) {
      return res.status(404).json({ success: false, message: 'Entry not found at provided index' });
    }

    const entries = (datesheet.entries || []).map((e) => (e.toObject ? e.toObject() : { ...e }));
    const cur = { ...entries[idx] };

    if (courseCode != null && String(courseCode).trim() !== '') {
      cur.courseCode = String(courseCode).trim().toUpperCase();
    }
    if (courseName != null && String(courseName).trim() !== '') {
      cur.courseName = String(courseName).trim();
    }
    if (teacherName != null) cur.teacherName = String(teacherName).trim();
    if (className != null) cur.className = String(className).trim();
    if (program != null) cur.program = String(program).trim() || undefined;
    if (degreeLevel != null) cur.degreeLevel = String(degreeLevel).trim() || undefined;
    if (semester !== undefined && semester !== null && String(semester).trim() !== '') {
      const s = parseInt(String(semester), 10);
      if (!Number.isNaN(s)) cur.semester = s;
    }
    if (classroomCapacity !== undefined && classroomCapacity !== null && String(classroomCapacity).trim() !== '') {
      const c = parseInt(String(classroomCapacity), 10);
      cur.classroomCapacity = Number.isNaN(c) ? undefined : c;
    }

    if (examDate !== undefined && examDate !== null && String(examDate).trim() !== '') {
      const d = new Date(examDate);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid exam date' });
      }
      const day = d.getDay();
      if (day === 0 || day === 6) {
        return res.status(400).json({
          success: false,
          message: 'Exam date cannot be Saturday or Sunday.'
        });
      }
      cur.examDate = d;
    }

    if (timeSlot === 'morning' || timeSlot === 'evening') {
      cur.timeSlot = timeSlot;
      cur.startTime = SLOT_TIMES[timeSlot].startTime;
      cur.endTime = SLOT_TIMES[timeSlot].endTime;
    }

    entries[idx] = cur;

    const rules = validateEntriesRules(entries);
    if (!rules.valid) {
      return res.status(400).json({ success: false, message: rules.message });
    }

    datesheet.entries = entries;
    datesheet.conflicts = computeDatesheetConflicts(entries);
    await datesheet.save();

    res.json({
      success: true,
      message: 'Exam entry updated successfully',
      datesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/exam-datesheets/:id/entry/:entryIndex
exports.deleteDatesheetEntry = async (req, res) => {
  try {
    const idx = Number(req.params.entryIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ success: false, message: 'Valid entry index is required' });
    }

    const datesheet = await ExamDatesheet.findById(req.params.id);
    if (!datesheet) {
      return res.status(404).json({ success: false, message: 'Exam datesheet not found' });
    }
    if (!datesheet.entries || idx >= datesheet.entries.length) {
      return res.status(404).json({ success: false, message: 'Entry not found at provided index' });
    }

    const entries = (datesheet.entries || []).filter((_, i) => i !== idx);
    datesheet.entries = entries;
    datesheet.conflicts = computeDatesheetConflicts(entries);
    await datesheet.save();

    res.json({
      success: true,
      message: 'Exam entry removed from datesheet',
      datesheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/exam-datesheets/:id
exports.deleteDatesheet = async (req, res) => {
  try {
    const datesheet = await ExamDatesheet.findById(req.params.id);

    if (!datesheet) {
      return res.status(404).json({
        success: false,
        message: 'Exam datesheet not found'
      });
    }

    await ExamDatesheet.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Exam datesheet deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
