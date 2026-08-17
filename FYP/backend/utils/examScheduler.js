const Class = require('../models/Class');

// Fixed exam time slots
const DEFAULT_SLOTS = {
  morning: { startTime: '09:15', endTime: '12:15' },
  evening: { startTime: '12:45', endTime: '15:45' }
};

// Parse YYYY-MM-DD string to avoid timezone issues
const parseDateString = (dateInput) => {
  const d = new Date(dateInput);
  const iso = d.toISOString().slice(0, 10);
  const [y, m, dVal] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: dVal };
};

const isWeekendUTC = (year, month, day) => {
  const dayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0=Sunday, 6=Saturday
};

const formatDateOnly = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// Build list of working days between start and end (inclusive)
// Uses UTC for weekend check so Saturday/Sunday are always excluded regardless of server timezone
const buildWorkingDays = (startDate, endDate, excludeWeekends = true) => {
  const days = [];
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  let y = start.year;
  let m = start.month;
  let d = start.day;
  const endTime = new Date(Date.UTC(end.year, end.month, end.day)).getTime();

  while (true) {
    const currentTime = new Date(Date.UTC(y, m, d)).getTime();
    if (currentTime > endTime) break;

    const skip = excludeWeekends && isWeekendUTC(y, m, d);
    if (!skip) {
      days.push(new Date(Date.UTC(y, m, d, 12, 0, 0)));
    }

    d += 1;
    const next = new Date(Date.UTC(y, m, d));
    y = next.getUTCFullYear();
    m = next.getUTCMonth();
    d = next.getUTCDate();
  }

  return days;
};

/**
 * Generate exam schedule.
 *
 * @param {Object[]} exams - Array of exam definitions:
 *   {
 *     courseCode, courseName, semester, program, degreeLevel, teacherName,
 *     students: [{ registrationNo, name, semester, program, degreeLevel }]
 *   }
 * @param {Object} options
 *   - startDate: Date
 *   - endDate: Date
 *   - excludeWeekends: Boolean
 *   - timeSlots: { morning, evening } (optional override)
 *
 * @returns {Object} { entries, conflicts }
 */
const generateExamSchedule = async (exams, options) => {
  const {
    startDate,
    endDate,
    timeSlots = DEFAULT_SLOTS
  } = options || {};

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required for exam scheduling');
  }

  const workingDays = buildWorkingDays(startDate, endDate, true);

  if (workingDays.length === 0) {
    throw new Error('No working days available in the selected range. Exams cannot be scheduled on Saturday or Sunday.');
  }

  const classes = await Class.find().sort({ capacity: 1 });

  if (!classes || classes.length === 0) {
    throw new Error('No classrooms defined. Please add classrooms first.');
  }

  // Sort exams by number of students (largest first) to place hardest ones first
  const sortedExams = [...exams].sort((a, b) => {
    const aCount = a.students ? a.students.length : 0;
    const bCount = b.students ? b.students.length : 0;
    return bCount - aCount;
  });

  const studentDailyMap = {}; // regNo -> { dateKey: { slots: Set<'morning' | 'evening'> } }
  const teacherDailyMap = {}; // teacherName -> { dateKey: Set<'morning'|'evening'> } — at most one slot/day (size 0 or 1)
  const classroomMap = {}; // className -> { dateKey: Set<'morning' | 'evening'> }

  const entries = [];
  const conflicts = [];

  const getDateKey = (date) => new Date(date).toISOString().slice(0, 10);

  const ensureStudentDayRecord = (regNo, dateKey) => {
    if (!studentDailyMap[regNo]) studentDailyMap[regNo] = {};
    if (!studentDailyMap[regNo][dateKey]) studentDailyMap[regNo][dateKey] = { slots: new Set() };
    return studentDailyMap[regNo][dateKey];
  };

  const ensureTeacherDayRecord = (teacherName, dateKey) => {
    if (!teacherDailyMap[teacherName]) teacherDailyMap[teacherName] = {};
    if (!teacherDailyMap[teacherName][dateKey]) teacherDailyMap[teacherName][dateKey] = new Set();
    return teacherDailyMap[teacherName][dateKey];
  };

  const ensureClassroomDayRecord = (className, dateKey) => {
    if (!classroomMap[className]) classroomMap[className] = {};
    if (!classroomMap[className][dateKey]) classroomMap[className][dateKey] = new Set();
    return classroomMap[className][dateKey];
  };

  // Helper to choose the best AVAILABLE classroom for given student count/date/slot.
  // Prefer the smallest fitting free room; if none fit, use largest free room (capacity warning later).
  const chooseAvailableClassroom = (studentCount, dateKey, slotName) => {
    const fittingRooms = classes.filter((cls) => cls.capacity >= studentCount);
    for (const cls of fittingRooms) {
      const roomDaySlots = ensureClassroomDayRecord(cls.className, dateKey);
      if (!roomDaySlots.has(slotName)) return cls;
    }

    // No fitting free room. Try any free room (largest first) and flag capacity later.
    for (let i = classes.length - 1; i >= 0; i -= 1) {
      const cls = classes[i];
      const roomDaySlots = ensureClassroomDayRecord(cls.className, dateKey);
      if (!roomDaySlots.has(slotName)) return cls;
    }

    return null; // All rooms occupied in this slot.
  };

  // Try assign function with max 1 exam/day per student (phase 1), then allow 2 (phase 2)
  const tryAssignExam = (exam, allowTwoPerDay) => {
    const students = exam.students || [];
    const teacherName = exam.teacherName || 'UNKNOWN';

    for (const date of workingDays) {
      const dateKey = getDateKey(date);

      for (const slotName of ['morning', 'evening']) {
        const slot = timeSlots[slotName];
        if (!slot) continue;

        // Student constraints
        let violatesHardRule = false;

        for (const s of students) {
          const rec = ensureStudentDayRecord(s.registrationNo, dateKey);
          const alreadySlots = rec.slots;

          if (!allowTwoPerDay) {
            // Phase 1: completely avoid any other exam that day
            if (alreadySlots.size > 0) {
              violatesHardRule = true;
              break;
            }
          } else {
            // Phase 2: allow at most 2 exams per day (morning + evening only)
            if (alreadySlots.size >= 2 || alreadySlots.has(slotName)) {
              violatesHardRule = true;
              break;
            }
          }
        }

        if (violatesHardRule) continue;

        // Teacher: conflict only if same time slot on the same day
        const teacherDaySlots = ensureTeacherDayRecord(teacherName, dateKey);
        if (teacherDaySlots.has(slotName)) {
          continue;
        }

        // Choose a free classroom for this slot
        const studentCount = students.length;
        const classroom = chooseAvailableClassroom(studentCount, dateKey, slotName);
        if (!classroom) {
          continue;
        }
        const classroomDaySlots = ensureClassroomDayRecord(classroom.className, dateKey);

        // We can schedule this exam here
        // Update maps
        for (const s of students) {
          const rec = ensureStudentDayRecord(s.registrationNo, dateKey);
          rec.slots.add(slotName);
        }
        teacherDaySlots.add(slotName);
        classroomDaySlots.add(slotName);

        const entry = {
          courseCode: exam.courseCode,
          courseName: exam.courseName,
          semester: exam.semester,
          program: exam.program,
          degreeLevel: exam.degreeLevel,
          teacherName,
          examDate: date,
          timeSlot: slotName,
          startTime: slot.startTime,
          endTime: slot.endTime,
          classId: classroom._id,
          className: classroom.className,
          classroomCapacity: classroom.capacity,
          students,
          totalStudents: studentCount
        };

        entries.push(entry);
        return true;
      }
    }

    return false;
  };

  // Phase 1: strictly max 1 exam per student per day
  for (const exam of sortedExams) {
    const scheduled = tryAssignExam(exam, false);
    if (!scheduled) {
      // Phase 2: allow at most morning + evening same day for a student (worst case)
      tryAssignExam(exam, true);
    }
  }

  const clashConflicts = detectScheduleClashes(entries, getDateKey);
  return { entries, conflicts: [...conflicts, ...clashConflicts] };
};

// Only report student same-slot clashes for UI.
const detectScheduleClashes = (entries, getDateKey) => {
  const out = [];
  const byStudentDay = {}; // dateKey -> registrationNo -> { name, exams }

  for (const entry of entries || []) {
    const dateKey = getDateKey(entry.examDate);
    const slot = entry.timeSlot === 'evening' ? 'evening' : 'morning';

    for (const s of entry.students || []) {
      const reg = s.registrationNo || 'UNKNOWN';
      if (!byStudentDay[dateKey]) byStudentDay[dateKey] = {};
      if (!byStudentDay[dateKey][reg]) {
        byStudentDay[dateKey][reg] = {
          registrationNo: reg,
          name: s.name,
          exams: []
        };
      }
      byStudentDay[dateKey][reg].exams.push({
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        timeSlot: slot
      });
    }
  }

  Object.entries(byStudentDay).forEach(([dateKey, perStudent]) => {
    Object.values(perStudent).forEach((rec) => {
      const { registrationNo, name, exams } = rec;
      const slotCounts = exams.reduce((acc, e) => {
        const key = e.timeSlot;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const clashSlot = Object.keys(slotCounts).find((s) => slotCounts[s] > 1);

      if (clashSlot) {
        out.push({
          isScheduleClash: true,
          type: 'student',
          severity: 'critical',
          message: `Student ${registrationNo}${name ? ` (${name})` : ''} has two exams in the same time slot (${clashSlot}) on ${dateKey}.`,
          details: { registrationNo, name, date: dateKey, exams }
        });
      }
    });
  });

  return out;
};

module.exports = {
  generateExamSchedule,
  DEFAULT_SLOTS,
  buildWorkingDays
};





