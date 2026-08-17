const Timetable = require('../models/Timetable');
const Registration = require('../models/Registration');
const Allocation = require('../models/Allocation');
const Course = require('../models/Course');
const Class = require('../models/Class');
const User = require('../models/User');

// Helper function to check time overlap
const timeOverlaps = (start1, end1, start2, end2) => {
  const [h1, m1] = start1.split(':').map(Number);
  const [h2, m2] = end1.split(':').map(Number);
  const [h3, m3] = start2.split(':').map(Number);
  const [h4, m4] = end2.split(':').map(Number);

  const time1Start = h1 * 60 + m1;
  const time1End = h2 * 60 + m2;
  const time2Start = h3 * 60 + m3;
  const time2End = h4 * 60 + m4;

  return (time1Start < time2End && time1End > time2Start);
};

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.toString) return value.toString();
  return String(value);
};

// Require at least `breakMinutes` gap between teacher classes.
// Conflict exists unless one class ends + break before the other starts.
const violatesTeacherGapRule = (start1, end1, start2, end2, breakMinutes = 10) => {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  const hasRequiredGap = (e1 + breakMinutes <= s2) || (e2 + breakMinutes <= s1);
  return !hasRequiredGap;
};

// Helper function to get next day (for consecutive day checking)
const getNextDay = (day) => {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentIndex = dayOrder.indexOf(day);
  return currentIndex !== -1 && currentIndex < dayOrder.length - 1 ? dayOrder[currentIndex + 1] : null;
};

// Helper function to get previous day (for consecutive day checking)
const getPreviousDay = (day) => {
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentIndex = dayOrder.indexOf(day);
  return currentIndex > 0 ? dayOrder[currentIndex - 1] : null;
};

// Helper function to check if teacher has classes on a specific day
const teacherHasClassesOnDay = async (teacherId, day, academicYear, excludeId = null) => {
  if (!day) return false;
  const existingTimetables = await Timetable.find({
    teacherId,
    day,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  });
  return existingTimetables.length > 0;
};

// Helper function to count how many classes a teacher has on a specific day
const getTeacherClassesCountOnDay = async (teacherId, day, academicYear, excludeId = null, scheduledInCurrentBatch = []) => {
  if (!day) return 0;
  const count = await Timetable.countDocuments({
    teacherId,
    day,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  });
  
  // Also count classes scheduled in current batch
  const batchCount = scheduledInCurrentBatch.filter(s => {
    if (!s.teacherId || !s.day) return false;
    const sTeacherId = s.teacherId.toString ? s.teacherId.toString() : (s.teacherId._id ? s.teacherId._id.toString() : String(s.teacherId));
    const teacherIdStr = teacherId.toString();
    return sTeacherId === teacherIdStr && s.day === day;
  }).length;
  
  return count + batchCount;
};

// Helper function to check if teacher can have more classes on a day.
// Keep strict limit at 2 classes/day per teacher.
const canTeacherScheduleOnDay = async (teacherId, day, academicYear, excludeId = null, scheduledInCurrentBatch = []) => {
  const currentCount = await getTeacherClassesCountOnDay(teacherId, day, academicYear, excludeId, scheduledInCurrentBatch);
  return currentCount < 2; // Maximum 2 classes per day
};

// Check conflicts for a given schedule entry
const checkConflicts = async (courseId, teacherId, classId, day, startTime, endTime, semester, academicYear, excludeId = null) => {
  const conflicts = {
    classroom: [],
    teacher: [],
    student: []
  };

  // Check classroom conflicts
  const classroomConflict = await Timetable.findOne({
    classId,
    day,
    status: 'active',
    semester,
    academicYear,
    _id: { $ne: excludeId },
    $or: [
      {
        $expr: {
          $function: {
            body: function(start1, end1, start2, end2) {
              const [h1, m1] = start1.split(':').map(Number);
              const [h2, m2] = end1.split(':').map(Number);
              const [h3, m3] = start2.split(':').map(Number);
              const [h4, m4] = end2.split(':').map(Number);
              const time1Start = h1 * 60 + m1;
              const time1End = h2 * 60 + m2;
              const time2Start = h3 * 60 + m3;
              const time2End = h4 * 60 + m4;
              return time1Start < time2End && time1End > time2Start;
            },
            args: [startTime, endTime, "$startTime", "$endTime"],
            lang: "js"
          }
        }
      }
    ]
  });

  if (classroomConflict) {
    conflicts.classroom.push({
      timetableId: classroomConflict._id,
      courseId: classroomConflict.courseId,
      message: `Classroom already booked for ${day} ${startTime}-${endTime}`
    });
  }

  // Check teacher conflicts
  const teacherConflict = await Timetable.findOne({
    teacherId,
    day,
    status: 'active',
    semester,
    academicYear,
    _id: { $ne: excludeId },
    $or: [
      {
        $expr: {
          $function: {
            body: function(start1, end1, start2, end2) {
              const [h1, m1] = start1.split(':').map(Number);
              const [h2, m2] = end1.split(':').map(Number);
              const [h3, m3] = start2.split(':').map(Number);
              const [h4, m4] = end2.split(':').map(Number);
              const time1Start = h1 * 60 + m1;
              const time1End = h2 * 60 + m2;
              const time2Start = h3 * 60 + m3;
              const time2End = h4 * 60 + m4;
              return time1Start < time2End && time1End > time2Start;
            },
            args: [startTime, endTime, "$startTime", "$endTime"],
            lang: "js"
          }
        }
      }
    ]
  });

  if (teacherConflict) {
    conflicts.teacher.push({
      timetableId: teacherConflict._id,
      courseId: teacherConflict.courseId,
      message: `Teacher already has a class for ${day} ${startTime}-${endTime}`
    });
  }

  // Check student conflicts (students registered in this course vs other courses)
  const registrations = await Registration.find({
    courseId,
    status: 'registered'
  }).populate('studentId');

  for (const reg of registrations) {
    const studentOtherRegs = await Registration.find({
      studentId: reg.studentId,
      courseId: { $ne: courseId },
      status: 'registered'
    });

    for (const otherReg of studentOtherRegs) {
      const otherTimetable = await Timetable.findOne({
        courseId: otherReg.courseId,
        semester,
        academicYear,
        status: 'active',
        day,
        _id: { $ne: excludeId }
      });

      if (otherTimetable && timeOverlaps(startTime, endTime, otherTimetable.startTime, otherTimetable.endTime)) {
        conflicts.student.push({
          studentId: reg.studentId._id,
          studentName: reg.studentId.name,
          conflictingCourseId: otherReg.courseId,
          message: `Student ${reg.studentId.name} has a time conflict with another course`
        });
      }
    }
  }

  return conflicts;
};

// Enhanced conflict checker with better accuracy
const checkConflictsSimple = async (courseId, teacherId, classId, day, startTime, endTime, semester, academicYear, excludeId = null, scheduledInCurrentBatch = []) => {
  const conflicts = {
    classroom: [],
    teacher: [],
    student: [],
    duplicate: [] // Track duplicate course scheduling
  };

  // Check for duplicate course scheduling (same course already scheduled at this time OR overlapping time)
  // First check exact duplicates
  const exactDuplicate = await Timetable.findOne({
    courseId,
    day,
    startTime,
    endTime,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  });

  if (exactDuplicate) {
    conflicts.duplicate.push({
      timetableId: exactDuplicate._id,
      message: `This course is already scheduled at ${day} ${startTime}-${endTime}. Cannot schedule duplicate classes.`
    });
  }
  
  // Check for overlapping times for the same course (same course shouldn't have overlapping times)
  const sameCourseTimetables = await Timetable.find({
    courseId,
    day,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  });
  
  for (const existing of sameCourseTimetables) {
    if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
      conflicts.duplicate.push({
        timetableId: existing._id,
        message: `This course already has an overlapping class at ${day} ${existing.startTime}-${existing.endTime}. Cannot schedule overlapping classes for the same course.`
      });
    }
  }

  // Also check scheduledInCurrentBatch for duplicates within the same generation
  for (const scheduled of scheduledInCurrentBatch) {
    if (!scheduled.courseId) continue;
    const sCourseId = scheduled.courseId.toString ? scheduled.courseId.toString() : (scheduled.courseId._id ? scheduled.courseId._id.toString() : String(scheduled.courseId));
    const courseIdStr = courseId.toString();
    
    // Check for exact duplicate
    if (sCourseId === courseIdStr && 
        scheduled.day === day && 
        scheduled.startTime === startTime && 
        scheduled.endTime === endTime) {
      conflicts.duplicate.push({
        message: `This course is already being scheduled at ${day} ${startTime}-${endTime} in this batch`
      });
    }
    // Check for overlapping times (same course shouldn't have overlapping times)
    else if (sCourseId === courseIdStr && scheduled.day === day) {
      if (timeOverlaps(startTime, endTime, scheduled.startTime, scheduled.endTime)) {
        conflicts.duplicate.push({
          message: `This course already has an overlapping class scheduled at ${day} ${scheduled.startTime}-${scheduled.endTime} in this batch`
        });
      }
    }
  }

  // Preload registration data once (instead of per-overlap entry)
  const currentRegistrations = await Registration.find({
    courseId,
    status: 'registered'
  }).select('studentId');
  const currentStudentIds = new Set(currentRegistrations.map((r) => r.studentId.toString()));

  // Cache registrations per other course to avoid repeated DB hits
  const otherCourseRegistrationCache = new Map();
  const studentCache = new Map();

  // Get all existing timetables for the same day, semester, and academic year
  const existingTimetables = await Timetable.find({
    day,
    semester,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  }).select('courseId teacherId classId day startTime endTime');

  // Also check scheduledInCurrentBatch
  const allTimetables = [...existingTimetables, ...scheduledInCurrentBatch];

  for (const existing of allTimetables) {
    // Handle both database objects and batch objects
    const existingStartTime = existing.startTime;
    const existingEndTime = existing.endTime;
    
    if (!existingStartTime || !existingEndTime) continue;
    
    if (timeOverlaps(startTime, endTime, existingStartTime, existingEndTime)) {
      // Check classroom conflict
      const existingClassId = existing.classId?._id?.toString() || existing.classId?.toString() || existing.classId;
      if (existingClassId && existingClassId.toString() === classId.toString()) {
        conflicts.classroom.push({
          timetableId: existing._id,
          courseId: existing.courseId?._id || existing.courseId,
          message: `Classroom already booked for ${day} ${startTime}-${endTime}`
        });
      }

      // Check teacher conflict
      // IMPORTANT: Only check conflicts for the SAME teacher
      // Different teachers CAN have classes at the same time slot (in different classrooms)
      // Teachers can have up to 2 classes per day, and they can be consecutive
      // But cannot have overlapping times (same teacher cannot teach two classes simultaneously)
      const existingTeacherId = existing.teacherId?._id?.toString() || existing.teacherId?.toString() || existing.teacherId;
      if (existingTeacherId && existingTeacherId.toString() === teacherId.toString()) {
        if (violatesTeacherGapRule(startTime, endTime, existing.startTime, existing.endTime, 0)) {
          // Times overlap or don't have required break.
          conflicts.teacher.push({
            timetableId: existing._id,
            courseId: existing.courseId?._id || existing.courseId,
            message: `Teacher already has an overlapping class for ${day} ${existing.startTime}-${existing.endTime}.`
          });
        }
        // Note: We don't check the 2-class limit here because we're iterating through existing timetables
        // The limit check is done in the scheduling logic before calling checkConflictsSimple
      }

      // Check student conflicts
      const existingCourseId = existing.courseId?._id || existing.courseId;
      if (!existingCourseId) continue; // Skip if no course ID

      const existingCourseKey = existingCourseId.toString();
      let otherStudentIds = otherCourseRegistrationCache.get(existingCourseKey);
      if (!otherStudentIds) {
        const otherRegistrations = await Registration.find({
          courseId: existingCourseId,
          status: 'registered'
        }).select('studentId');
        otherStudentIds = new Set(otherRegistrations.map((r) => r.studentId.toString()));
        otherCourseRegistrationCache.set(existingCourseKey, otherStudentIds);
      }

      // Set intersection: students registered in both courses
      for (const studentId of currentStudentIds) {
        if (!otherStudentIds.has(studentId)) continue;
        let student = studentCache.get(studentId);
        if (!student) {
          student = await User.findById(studentId).select('name');
          if (!student) continue;
          studentCache.set(studentId, student);
        }
        conflicts.student.push({
          studentId: studentId,
          studentName: student.name,
          conflictingCourseId: existingCourseId,
          message: `Student ${student.name} has a time conflict between courses`
        });
      }
    }
  }

  return conflicts;
};

// Helper function to calculate class schedule based on credit hours
const getClassSchedule = (credits) => {
  switch (credits) {
    case 1:
      // 1 credit: 1 class per week, 1.5 hours
      return {
        theoryClasses: [{ duration: 90 }], // 90 minutes = 1.5 hours
        labClasses: []
      };
    case 2:
      // 2 credits: Either 1 class of 2 hours OR 2 classes of 1 hour
      // We'll use 2 classes of 1 hour for better distribution
      return {
        theoryClasses: [
          { duration: 60 }, // 1 hour
          { duration: 60 }  // 1 hour
        ],
        labClasses: []
      };
    case 3:
      // 3 credits: 2 classes per week, each 1.5 hours
      return {
        theoryClasses: [
          { duration: 90 }, // 1.5 hours
          { duration: 90 }  // 1.5 hours
        ],
        labClasses: []
      };
    case 4:
      // 4 credits: 2 theory classes (1.5 hours each) + 1 lab (1 hour)
      return {
        theoryClasses: [
          { duration: 90 }, // 1.5 hours
          { duration: 90 }  // 1.5 hours
        ],
        labClasses: [
          { duration: 60 } // 1 hour lab
        ]
      };
    default:
      // Default: 1 class per credit hour, 1 hour each
      return {
        theoryClasses: Array(credits).fill({ duration: 60 }),
        labClasses: []
      };
  }
};

// Helper function to add minutes to time string
const addMinutesToTime = (timeStr, minutes) => {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

// Helper function to add 10-minute break after a time
const addBreakToTime = (timeStr) => {
  return addMinutesToTime(timeStr, 10);
};

// Helper function to generate FIXED official slots.
// If base slot already has explicit start-end (e.g. 09:00-10:30), keep it exactly.
// This prevents mixed columns like 09:00-10:00 and 09:00-10:30 in UI.
const generateTimeSlots = (baseTimeSlots, duration) => {
  const slots = [];
  for (const slot of baseTimeSlots) {
    // Handle both formats: '09:00' or '09:00-10:30'
    let startTime;
    let endTime;
    if (slot.includes('-')) {
      [startTime, endTime] = slot.split('-');
      slots.push({ startTime, endTime, duration: toMinutes(endTime) - toMinutes(startTime) });
      continue;
    } else {
      startTime = slot;
    }
    // If only start time is provided, derive end with duration.
    endTime = addMinutesToTime(startTime, duration);
    slots.push({ startTime, endTime, duration });
  }
  return slots;
};

// Helper function to filter out slots that would overlap with already scheduled slots for the same course
const filterOverlappingSlots = (slots, courseId, day, scheduledSlots, scheduledInCurrentBatch, existingCourseTimetables) => {
  const courseIdStr = courseId.toString();
  const filteredSlots = [];
  
  for (const slot of slots) {
    let hasOverlap = false;
    
    // Check scheduled slots in current batch
    for (const scheduled of scheduledInCurrentBatch) {
      if (!scheduled.courseId) continue;
      const sCourseId = scheduled.courseId.toString ? scheduled.courseId.toString() : (scheduled.courseId._id ? scheduled.courseId._id.toString() : String(scheduled.courseId));
      
      if (sCourseId === courseIdStr && scheduled.day === day) {
        if (timeOverlaps(slot.startTime, slot.endTime, scheduled.startTime, scheduled.endTime)) {
          hasOverlap = true;
          break;
        }
      }
    }
    
    // Check scheduled slots for this course iteration
    if (!hasOverlap) {
      for (const scheduledSlot of scheduledSlots) {
        if (scheduledSlot.day === day) {
          if (timeOverlaps(slot.startTime, slot.endTime, scheduledSlot.startTime, scheduledSlot.endTime)) {
            hasOverlap = true;
            break;
          }
        }
      }
    }
    
    // Check existing course timetables in database
    if (!hasOverlap) {
      for (const existing of existingCourseTimetables) {
        if (existing.day === day) {
          if (timeOverlaps(slot.startTime, slot.endTime, existing.startTime, existing.endTime)) {
            hasOverlap = true;
            break;
          }
        }
      }
    }
    
    if (!hasOverlap) {
      filteredSlots.push(slot);
    }
  }
  
  return filteredSlots;
};

// Fast in-memory conflict checker used by auto-generation.
const checkConflictsFast = ({ courseId, teacherId, classId, day, startTime, endTime, scheduledInCurrentBatch, context }) => {
  const conflicts = {
    classroom: [],
    teacher: [],
    student: [],
    duplicate: []
  };

  const courseIdStr = toIdString(courseId);
  const teacherIdStr = toIdString(teacherId);
  const classIdStr = toIdString(classId);
  const courseDayKey = `${courseIdStr}|${day}`;

  const existingForCourseDay = context.existingByCourseDay.get(courseDayKey) || [];
  for (const existing of existingForCourseDay) {
    if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
      conflicts.duplicate.push({
        timetableId: existing._id,
        message: `This course already has an overlapping class at ${day} ${existing.startTime}-${existing.endTime}.`
      });
    }
  }

  for (const scheduled of scheduledInCurrentBatch) {
    if (toIdString(scheduled.courseId) !== courseIdStr || scheduled.day !== day) continue;
    if (timeOverlaps(startTime, endTime, scheduled.startTime, scheduled.endTime)) {
      conflicts.duplicate.push({
        message: `This course already has an overlapping class in this generation batch.`
      });
    }
  }

  const dayEntries = context.existingByDay.get(day) || [];
  const allEntriesForDay = [...dayEntries, ...scheduledInCurrentBatch.filter((s) => s.day === day)];

  const currentCourseStudents = context.registrationSetByCourse.get(courseIdStr) || new Set();

  for (const existing of allEntriesForDay) {
    if (!existing.startTime || !existing.endTime) continue;
    if (!timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) continue;

    if (toIdString(existing.classId) === classIdStr) {
      conflicts.classroom.push({
        timetableId: existing._id,
        courseId: existing.courseId,
        message: `Classroom already booked for ${day} ${startTime}-${endTime}`
      });
    }

    if (toIdString(existing.teacherId) === teacherIdStr &&
        violatesTeacherGapRule(startTime, endTime, existing.startTime, existing.endTime, 0)) {
      conflicts.teacher.push({
        timetableId: existing._id,
        courseId: existing.courseId,
        message: `Teacher already has an overlapping class for ${day} ${existing.startTime}-${existing.endTime}.`
      });
    }

    const otherCourseIdStr = toIdString(existing.courseId);
    if (!otherCourseIdStr || otherCourseIdStr === courseIdStr) continue;
    const otherCourseStudents = context.registrationSetByCourse.get(otherCourseIdStr) || new Set();
    if (currentCourseStudents.size === 0 || otherCourseStudents.size === 0) continue;

    let hasIntersection = false;
    for (const studentId of currentCourseStudents) {
      if (otherCourseStudents.has(studentId)) {
        hasIntersection = true;
        break;
      }
    }
    if (hasIntersection) {
      conflicts.student.push({
        conflictingCourseId: existing.courseId,
        message: `Student conflict detected between overlapping courses`
      });
    }
  }

  return conflicts;
};

// Generate timetable automatically
const generateTimetable = async (degreeLevel, academicYear, timeSlots, days, priorities = {}, semester = null) => {
  // Get all allocations and filter by degree level
  const allocations = await Allocation.find({ status: 'allocated' })
    .populate({
      path: 'courseId',
      match: { degreeLevels: degreeLevel }
    })
    .populate('teacherId');

  // Filter out allocations where course doesn't match degree level
  // Also filter by semester if provided
  let filteredAllocations = allocations.filter(allocation => allocation.courseId !== null);
  
  // Filter by semester if provided
  if (semester !== null) {
    filteredAllocations = filteredAllocations.filter(allocation => 
      allocation.courseId && allocation.courseId.semester === parseInt(semester)
    );
  }

  if (filteredAllocations.length === 0) {
    console.log(`No allocations found for degree level: ${degreeLevel}`);
    return {
      timetables: [],
      unresolvedConflicts: [],
      totalScheduled: 0,
      totalConflicts: 0
    };
  }

  const classes = await Class.find();
  if (classes.length === 0) {
    console.log('No classrooms found');
    return {
      timetables: [],
      unresolvedConflicts: [],
      totalScheduled: 0,
      totalConflicts: 0
    };
  }

  const timetables = [];
  const unresolvedConflicts = [];
  const strictTeacherDailyLimit = 2;

  // Preload active timetable entries for this semester/year once.
  // IMPORTANT: Teacher/day load must be enforced globally across the academic year,
  // not per-semester. So we preload active entries for the whole year here.
  const existingSemesterEntries = await Timetable.find({ academicYear, status: 'active' })
    .select('courseId teacherId classId day startTime endTime')
    .lean();

  const existingByDay = new Map();
  const existingByCourseDay = new Map();
  for (const entry of existingSemesterEntries) {
    if (!existingByDay.has(entry.day)) existingByDay.set(entry.day, []);
    existingByDay.get(entry.day).push(entry);
    const key = `${toIdString(entry.courseId)}|${entry.day}`;
    if (!existingByCourseDay.has(key)) existingByCourseDay.set(key, []);
    existingByCourseDay.get(key).push(entry);
  }
  
  // Track all scheduled entries in this batch to prevent duplicates
  const scheduledInCurrentBatch = [];

  // Preload registrations count per course (removes repeated countDocuments in inner loops)
  const registrationAgg = await Registration.aggregate([
    { $match: { status: 'registered' } },
    { $group: { _id: '$courseId', count: { $sum: 1 } } }
  ]);
  const registrationCountByCourse = new Map(
    registrationAgg.map((row) => [row._id.toString(), row.count])
  );

  // Preload student registrations for ALL registered courses so student clashes
  // are checked globally across the generated year (not just current semester batch).
  const registrationRows = await Registration.find({ status: 'registered' })
    .select('courseId studentId')
    .lean();
  const registrationSetByCourse = new Map();
  for (const row of registrationRows) {
    const key = toIdString(row.courseId);
    if (!registrationSetByCourse.has(key)) registrationSetByCourse.set(key, new Set());
    registrationSetByCourse.get(key).add(toIdString(row.studentId));
  }

  const generationContext = {
    existingByDay,
    existingByCourseDay,
    registrationSetByCourse
  };
  
  // Track courses that have been fully scheduled to prevent duplicate scheduling across allocations
  const fullyScheduledCourses = new Set();

  const getTeacherClassesCountOnDayLocal = (teacherId, day) => {
    const teacherIdStr = toIdString(teacherId);
    const existingCount = (existingByDay.get(day) || []).filter(
      (e) => toIdString(e.teacherId) === teacherIdStr
    ).length;
    const batchCount = scheduledInCurrentBatch.filter(
      (s) => s.day === day && toIdString(s.teacherId) === teacherIdStr
    ).length;
    return existingCount + batchCount;
  };

  const getDayLoad = (day) => {
    const existingCount = (existingByDay.get(day) || []).length;
    const batchCount = scheduledInCurrentBatch.filter((s) => s.day === day).length;
    return existingCount + batchCount;
  };

  const getOrderedDaysForTeacher = (teacherId, courseIdStr = '') => {
    const base = [...days].sort((a, b) => {
      const teacherA = getTeacherClassesCountOnDayLocal(teacherId, a);
      const teacherB = getTeacherClassesCountOnDayLocal(teacherId, b);
      const loadA = getDayLoad(a);
      const loadB = getDayLoad(b);
      if (loadA !== loadB) return loadA - loadB;
      if (teacherA !== teacherB) return teacherA - teacherB;

      return 0;
    });

    // Rotate tie-order per course so scheduling doesn't always start on Monday.
    const hash = [...courseIdStr].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const rotateBy = base.length > 0 ? hash % base.length : 0;
    return [...base.slice(rotateBy), ...base.slice(0, rotateBy)];
  };

  const getTeacherDayCountStrict = async (teacherId, day) => {
    const dbCount = await Timetable.countDocuments({
      teacherId,
      day,
      academicYear,
      status: 'active'
    });
    const batchCount = scheduledInCurrentBatch.filter(
      (s) => s.day === day && toIdString(s.teacherId) === toIdString(teacherId)
    ).length;
    return dbCount + batchCount;
  };
  
  console.log(`Generating timetable for ${degreeLevel}, ${filteredAllocations.length} allocations, ${classes.length} classrooms`);

  // Available time slots: ['09:00-10:30', '10:30-12:00', '12:00-13:30', '14:00-15:30', '15:30-17:00']
  // Days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  for (const allocation of filteredAllocations) {
    const course = allocation.courseId;
    const teacher = allocation.teacherId;

    if (!course || !teacher) continue;

    const courseIdStr = course._id.toString();
    
    // Skip if this course has already been fully scheduled in this generation batch
    if (fullyScheduledCourses.has(courseIdStr)) {
      console.log(`Course ${course.courseCode || course.courseId} already fully scheduled in this batch, skipping`);
      continue;
    }

    // Get class schedule based on credit hours
    const schedule = getClassSchedule(course.credits);
    const allClassesToSchedule = [
      ...schedule.theoryClasses.map(c => ({ ...c, isLab: false })),
      ...schedule.labClasses.map(c => ({ ...c, isLab: true }))
    ];
    
    // Check if this course is already fully scheduled in database (prevent duplicate scheduling)
    const existingInDB = await Timetable.find({
      courseId: course._id,
      academicYear,
      status: 'active'
    });
    
    const existingInBatch = scheduledInCurrentBatch.filter(s => {
      if (!s.courseId) return false;
      const sCourseId = s.courseId.toString ? s.courseId.toString() : (s.courseId._id ? s.courseId._id.toString() : String(s.courseId));
      return sCourseId === courseIdStr;
    });
    
    const totalExisting = existingInDB.length + existingInBatch.length;
    
    // Skip if course already has all required classes scheduled
    if (totalExisting >= allClassesToSchedule.length) {
      console.log(`Course ${course.courseCode || course.courseId} already fully scheduled (${totalExisting} existing, ${allClassesToSchedule.length} required), skipping`);
      fullyScheduledCourses.add(courseIdStr); // Mark as fully scheduled
      continue; // Course already fully scheduled
    }

    let scheduledClasses = existingInBatch.length; // Start with already scheduled count
    const scheduledSlots = []; // Track scheduled slots to avoid duplicates for this course

    // Schedule remaining required classes based on credit hours
    // Only schedule the remaining classes that haven't been scheduled yet
    const classesToScheduleNow = allClassesToSchedule.slice(existingInBatch.length);
    
    if (classesToScheduleNow.length === 0) {
      console.log(`Course ${course.courseCode || course.courseId} already fully scheduled, skipping`);
      continue;
    }
    
    console.log(`Scheduling course ${course.courseCode || course.courseId}: ${classesToScheduleNow.length} classes to schedule (${existingInBatch.length} already scheduled, ${allClassesToSchedule.length} total required)`);
    const registrations = registrationCountByCourse.get(course._id.toString()) || 0;
    const eligibleClasses = classes.filter((c) => c.capacity >= registrations);
    if (eligibleClasses.length === 0) {
      unresolvedConflicts.push({
        courseId: course._id,
        courseName: course.courseName,
        message: `No classroom has enough capacity (${registrations} students).`
      });
      continue;
    }
    
    for (const classToSchedule of classesToScheduleNow) {
      const duration = classToSchedule.duration;
      const isLab = classToSchedule.isLab;
      
      // Generate time slots for this duration
      // IMPORTANT: All classes will use the SAME predefined start times from timeSlots array
      // Duration only affects end time - start times are fixed and absolute
      // This ensures consistency: all classes start at the same times (e.g., all at 9:00, 10:30, etc.)
      const availableSlots = generateTimeSlots(timeSlots, duration);
      
      let scheduled = false;

      // Try to find a slot without conflicts
      // Priority: Student conflicts > Teacher conflicts > Classroom conflicts
      for (const day of getOrderedDaysForTeacher(teacher._id, courseIdStr)) {
        if (scheduled) break;

        // First pass: keep teacher load at max 2/day
        const canSchedule = getTeacherClassesCountOnDayLocal(teacher._id, day) < strictTeacherDailyLimit;
        if (!canSchedule) {
          continue; // Teacher already has 2 classes on this day
        }

        // For courses with multiple classes, try to space them out (e.g., Mon/Wed for 3 credits)
        // But allow if teacher has less than 2 classes on the day
        if (scheduledSlots.length > 0 && allClassesToSchedule.length > 1) {
          // Check if we've already scheduled on this day for this course
          const alreadyScheduledToday = scheduledSlots.some(slot => slot.day === day);
          // Also check if teacher already has classes on this day
          const teacherClassesOnDay = getTeacherClassesCountOnDayLocal(teacher._id, day);
          
          // Strong spread rule: do not place same course twice on same day in primary pass.
          if (alreadyScheduledToday) continue;

          if (teacherClassesOnDay >= strictTeacherDailyLimit) {
            continue;
          }
        }

        // Filter out slots that overlap course slots already in DB for this year/semester/day.
        const existingCourseTimetablesForDay = existingByCourseDay.get(`${courseIdStr}|${day}`) || [];
        
        const filteredSlots = filterOverlappingSlots(
          availableSlots,
          course._id,
          day,
          scheduledSlots,
          scheduledInCurrentBatch,
          existingCourseTimetablesForDay
        );

        const teacherExistingClasses = (existingByDay.get(day) || []).filter(
          (e) => toIdString(e.teacherId) === toIdString(teacher._id)
        );
        const teacherScheduledInBatch = scheduledInCurrentBatch.filter(s =>
          s.teacherId && (s.teacherId.toString() === teacher._id.toString() || (s.teacherId._id && s.teacherId._id.toString() === teacher._id.toString())) &&
          s.day === day
        );
        const allTeacherClasses = [...teacherExistingClasses, ...teacherScheduledInBatch];
        
        for (const slot of filteredSlots) {
          if (scheduled) break;

          let { startTime, endTime } = slot;
          
          // Check if this slot violates minimum teacher gap (10 minutes)
          let violatesBreakRule = false;
          for (const existingClass of allTeacherClasses) {
            if (violatesTeacherGapRule(startTime, endTime, existingClass.startTime, existingClass.endTime, 0)) {
              violatesBreakRule = true;
              break;
            }
          }
          
          if (violatesBreakRule) {
            continue; // Skip this slot - violates 10-minute break rule
          }

          // Find available classroom
          for (const classRoom of eligibleClasses) {
            if (scheduled) break;

            // Check if this slot was already used for this course (prevent duplicate)
            const slotKey = `${day}-${startTime}-${endTime}`;
            if (scheduledSlots.some(s => s.slotKey === slotKey)) {
              continue;
            }
            
            // Check if this course already has a class scheduled at this time or overlapping time (prevent duplicate)
            const courseAlreadyScheduled = scheduledInCurrentBatch.some(s => {
              if (!s.courseId) return false;
              const sCourseId = s.courseId.toString ? s.courseId.toString() : (s.courseId._id ? s.courseId._id.toString() : String(s.courseId));
              const courseIdStr = course._id.toString();
              // Check for exact duplicate
              if (sCourseId === courseIdStr && s.day === day && s.startTime === startTime && s.endTime === endTime) {
                return true;
              }
              // Check for overlapping times (same course shouldn't have overlapping times)
              if (sCourseId === courseIdStr && s.day === day) {
                if (timeOverlaps(startTime, endTime, s.startTime, s.endTime)) {
                  return true;
                }
              }
              return false;
            });
            
            if (courseAlreadyScheduled) {
              continue; // This course already scheduled at this exact time or overlapping time
            }
            
            let hasOverlappingInDB = false;
            for (const existing of existingCourseTimetablesForDay) {
              if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                hasOverlappingInDB = true;
                break;
              }
            }
            
            if (hasOverlappingInDB) {
              continue; // Course already has overlapping class in database, skip this slot
            }

            // Check conflicts (use course semester for conflict checking)
            const conflicts = checkConflictsFast({
              courseId: course._id,
              teacherId: teacher._id,
              classId: classRoom._id,
              day,
              startTime,
              endTime,
              scheduledInCurrentBatch,
              context: generationContext
            });

            // CRITICAL: Student conflicts must be zero - do not schedule if students have conflicts
            // Also check for duplicate course scheduling (same course at overlapping times)
            // Teacher and classroom conflicts are also avoided but can be resolved later
            if (conflicts.student.length === 0 && 
                conflicts.teacher.length === 0 && 
                conflicts.classroom.length === 0 &&
                conflicts.duplicate.length === 0) {
              // Final hard-stop: never allow >2 classes/day for a teacher.
              const strictTeacherCount = await getTeacherDayCountStrict(teacher._id, day);
              if (strictTeacherCount >= strictTeacherDailyLimit) {
                continue;
              }

              const timetable = await Timetable.create({
                courseId: course._id,
                teacherId: teacher._id,
                classId: classRoom._id,
                day,
                startTime,
                endTime,
                semester: course.semester, // Use course semester
                academicYear,
                status: 'active',
                isLab: isLab || false // Mark lab sessions
              });

              timetables.push(timetable);
              scheduledSlots.push({ day, startTime, endTime, slotKey });
              
              // Add to current batch tracking
              scheduledInCurrentBatch.push({
                courseId: course._id,
                teacherId: teacher._id,
                classId: classRoom._id,
                day,
                startTime,
                endTime,
                semester: course.semester,
                academicYear
              });
              
              scheduled = true;
              scheduledClasses++;
              console.log(`✓ Scheduled: ${course.courseCode || course.courseId} on ${day} ${startTime}-${endTime}`);
              
              // Check if course is now fully scheduled and mark it
              const currentScheduledCount = scheduledInCurrentBatch.filter(s => {
                if (!s.courseId) return false;
                const sCourseId = s.courseId.toString ? s.courseId.toString() : (s.courseId._id ? s.courseId._id.toString() : String(s.courseId));
                return sCourseId === courseIdStr;
              }).length;
              
              if (currentScheduledCount >= allClassesToSchedule.length) {
                fullyScheduledCourses.add(courseIdStr);
                console.log(`Course ${course.courseCode || course.courseId} is now fully scheduled (${currentScheduledCount}/${allClassesToSchedule.length} classes)`);
              }
              
              break;
            }
          }
        }
      }

      // If couldn't schedule without conflicts, try to schedule with minimal conflicts
      // BUT: Only schedule if student conflicts are zero (student conflicts are non-negotiable)
      if (!scheduled) {
        let bestSlot = null;
        let minConflicts = Infinity;

        for (const day of getOrderedDaysForTeacher(teacher._id, courseIdStr)) {
          // First fallback pass: keep teacher load at max 2/day
          const canSchedule = getTeacherClassesCountOnDayLocal(teacher._id, day) < strictTeacherDailyLimit;
          if (!canSchedule) {
            continue; // Teacher already has 2 classes on this day
          }

          // For courses with multiple classes, try to space them out
          // But allow consecutive classes if teacher has room
          if (scheduledSlots.length > 0 && allClassesToSchedule.length > 1) {
            const alreadyScheduledToday = scheduledSlots.some(slot => slot.day === day);
            const teacherClassesOnDay = getTeacherClassesCountOnDayLocal(teacher._id, day);
            
            // Keep spread in fallback too: avoid same course twice on same day.
            if (alreadyScheduledToday) continue;
            if (teacherClassesOnDay >= strictTeacherDailyLimit) continue;
          }

          // Filter out slots that overlap course slots already in DB for this year/semester/day.
          const existingCourseTimetablesForDayFallback = existingByCourseDay.get(`${courseIdStr}|${day}`) || [];
          
          const filteredSlotsFallback = filterOverlappingSlots(
            availableSlots,
            course._id,
            day,
            scheduledSlots,
            scheduledInCurrentBatch,
            existingCourseTimetablesForDayFallback
          );

          const teacherExistingClasses = (existingByDay.get(day) || []).filter(
            (e) => toIdString(e.teacherId) === toIdString(teacher._id)
          );
          const teacherScheduledInBatch = scheduledInCurrentBatch.filter(s =>
            s.teacherId && (s.teacherId.toString() === teacher._id.toString() || (s.teacherId._id && s.teacherId._id.toString() === teacher._id.toString())) &&
            s.day === day
          );
          const allTeacherClasses = [...teacherExistingClasses, ...teacherScheduledInBatch];
          
          for (const slot of filteredSlotsFallback) {
            let { startTime, endTime } = slot;
            const slotKey = `${day}-${startTime}-${endTime}`;
            
            // Skip if already scheduled
            if (scheduledSlots.some(s => s.slotKey === slotKey)) {
              continue;
            }
            
            // Check if this slot violates minimum teacher gap (10 minutes)
            let violatesBreakRule = false;
            for (const existingClass of allTeacherClasses) {
              if (violatesTeacherGapRule(startTime, endTime, existingClass.startTime, existingClass.endTime, 0)) {
                violatesBreakRule = true;
                break;
              }
            }
            
            if (violatesBreakRule) {
              continue; // Skip this slot - violates 10-minute break rule
            }
            
            // Check if this course already scheduled at this time or overlapping time (prevent duplicate)
            const courseAlreadyScheduled = scheduledInCurrentBatch.some(s => {
              if (!s.courseId) return false;
              const sCourseId = s.courseId.toString ? s.courseId.toString() : (s.courseId._id ? s.courseId._id.toString() : String(s.courseId));
              const courseIdStr = course._id.toString();
              // Check for exact duplicate
              if (sCourseId === courseIdStr && s.day === day && s.startTime === startTime && s.endTime === endTime) {
                return true;
              }
              // Check for overlapping times (same course shouldn't have overlapping times)
              if (sCourseId === courseIdStr && s.day === day) {
                if (timeOverlaps(startTime, endTime, s.startTime, s.endTime)) {
                  return true;
                }
              }
              return false;
            });
            
            if (courseAlreadyScheduled) {
              continue; // This course already scheduled at this exact time or overlapping time
            }
            
            let hasOverlappingInDB = false;
            for (const existing of existingCourseTimetablesForDayFallback) {
              if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                hasOverlappingInDB = true;
                break;
              }
            }
            
            if (hasOverlappingInDB) {
              continue; // Course already has overlapping class in database, skip this slot
            }

            for (const classRoom of eligibleClasses) {

              const conflicts = checkConflictsFast({
                courseId: course._id,
                teacherId: teacher._id,
                classId: classRoom._id,
                day,
                startTime,
                endTime,
                scheduledInCurrentBatch,
                context: generationContext
              });

              // Hard constraints: no student clash, no teacher overlap, no duplicate course slot.
              if (conflicts.student.length > 0 || conflicts.teacher.length > 0 || conflicts.duplicate.length > 0) {
                continue;
              }

              // Prefer minimum classroom conflicts among hard-safe candidates.
              const totalConflicts = conflicts.classroom.length;

              if (totalConflicts < minConflicts) {
                minConflicts = totalConflicts;
                bestSlot = {
                  day,
                  startTime,
                  endTime,
                  classId: classRoom._id,
                  conflicts,
                  slotKey
                };
              }
            }
          }
        }

        // Schedule fallback slot as long as hard constraints are satisfied.
        if (bestSlot && bestSlot.conflicts.student.length === 0 && bestSlot.conflicts.teacher.length === 0 && bestSlot.conflicts.duplicate.length === 0) {
          // Final hard-stop in fallback path as well.
          const strictTeacherCount = await getTeacherDayCountStrict(teacher._id, bestSlot.day);
          if (strictTeacherCount >= strictTeacherDailyLimit) {
            continue;
          }

          const timetable = await Timetable.create({
            courseId: course._id,
            teacherId: teacher._id,
            classId: bestSlot.classId,
            day: bestSlot.day,
            startTime: bestSlot.startTime,
            endTime: bestSlot.endTime,
            semester: course.semester, // Use course semester
            academicYear,
            status: 'active',
            isLab: isLab || false
          });

          timetables.push(timetable);
          scheduledSlots.push({ 
            day: bestSlot.day, 
            startTime: bestSlot.startTime, 
            endTime: bestSlot.endTime,
            slotKey: bestSlot.slotKey 
          });
          scheduledClasses++;
          scheduled = true;
          
          // Add to current batch tracking
          scheduledInCurrentBatch.push({
            courseId: course._id,
            teacherId: teacher._id,
            classId: bestSlot.classId,
            day: bestSlot.day,
            startTime: bestSlot.startTime,
            endTime: bestSlot.endTime,
            semester: course.semester,
            academicYear
          });
          
          unresolvedConflicts.push({
            courseId: course._id,
            courseName: course.courseName,
            timetableId: timetable._id,
            conflicts: bestSlot.conflicts
          });
        }
      }

    }

    // Check if course is now fully scheduled
    const finalScheduledCount = scheduledInCurrentBatch.filter(s => {
      if (!s.courseId) return false;
      const sCourseId = s.courseId.toString ? s.courseId.toString() : (s.courseId._id ? s.courseId._id.toString() : String(s.courseId));
      return sCourseId === courseIdStr;
    }).length;
    
    if (finalScheduledCount >= allClassesToSchedule.length) {
      fullyScheduledCourses.add(courseIdStr);
      console.log(`Course ${course.courseCode || course.courseId} is now fully scheduled (${finalScheduledCount} classes)`);
    }

    // If we couldn't schedule all required classes, add to unresolved conflicts
    if (scheduledClasses < allClassesToSchedule.length) {
      unresolvedConflicts.push({
        courseId: course._id,
        courseName: course.courseName,
        message: `Could not schedule all classes. Scheduled ${scheduledClasses} out of ${allClassesToSchedule.length} required classes.`
      });
    }
  }

  console.log(`Timetable generation complete for ${degreeLevel}: ${timetables.length} entries scheduled, ${unresolvedConflicts.length} conflicts`);
  
  return {
    timetables,
    unresolvedConflicts,
    totalScheduled: timetables.length,
    totalConflicts: unresolvedConflicts.length
  };
};

module.exports = {
  checkConflicts: checkConflictsSimple,
  generateTimetable,
  timeOverlaps,
  teacherHasClassesOnDay,
  getNextDay,
  getPreviousDay,
  getTeacherClassesCountOnDay,
  canTeacherScheduleOnDay
};

