const Timetable = require('../models/Timetable');
const Registration = require('../models/Registration');
const Allocation = require('../models/Allocation');
const Course = require('../models/Course');
const Class = require('../models/Class');

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

// Helper function to check if teacher can have more classes on a day (max 2 per day)
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

  // Get all existing timetables for the same day, semester, and academic year
  const existingTimetables = await Timetable.find({
    day,
    semester,
    academicYear,
    status: 'active',
    _id: { $ne: excludeId }
  }).populate('courseId teacherId classId');

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
          courseName: existing.courseId?.courseName || 'Unknown',
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
        // First, check if times overlap (excluding consecutive classes)
        const [h1, m1] = startTime.split(':').map(Number);
        const [h2, m2] = endTime.split(':').map(Number);
        const [h3, m3] = existing.startTime.split(':').map(Number);
        const [h4, m4] = existing.endTime.split(':').map(Number);
        const time1Start = h1 * 60 + m1;
        const time1End = h2 * 60 + m2;
        const time2Start = h3 * 60 + m3;
        const time2End = h4 * 60 + m4;
        
        // Check if times have proper 10-minute break or are overlapping
        // Classes need a 10-minute break: if one ends at 10:30, next should start at 10:40
        // Consecutive without break means: time1End == time2Start OR time2End == time1Start (NOT allowed)
        // Proper break means: time2Start >= time1End + 10 minutes OR time1Start >= time2End + 10 minutes
        const hasProperBreak = (time2Start >= time1End + 10) || (time1Start >= time2End + 10);
        const isConsecutiveWithoutBreak = (time1End === time2Start) || (time2End === time1Start);
        const isOverlapping = (time1Start < time2End && time1End > time2Start);
        
        if (isOverlapping || isConsecutiveWithoutBreak) {
          // Times overlap or don't have proper break - this is a conflict
          conflicts.teacher.push({
            timetableId: existing._id,
            courseId: existing.courseId?._id || existing.courseId,
            courseName: existing.courseId?.courseName || 'Unknown',
            message: `Teacher already has a class for ${day} ${existing.startTime}-${existing.endTime}. Classes must have a 10-minute break between them.`
          });
        }
        // Note: We don't check the 2-class limit here because we're iterating through existing timetables
        // The limit check is done in the scheduling logic before calling checkConflictsSimple
      }

      // Check student conflicts
      const existingCourseId = existing.courseId?._id || existing.courseId;
      if (!existingCourseId) continue; // Skip if no course ID
      
      const currentRegistrations = await Registration.find({
        courseId,
        status: 'registered'
      });

      const otherRegistrations = await Registration.find({
        courseId: existingCourseId,
        status: 'registered'
      });

      const commonStudents = currentRegistrations.filter(cr =>
        otherRegistrations.some(or => or.studentId.toString() === cr.studentId.toString())
      );

      for (const commonReg of commonStudents) {
        const student = await require('../models/User').findById(commonReg.studentId);
        conflicts.student.push({
          studentId: student._id,
          studentName: student.name,
          conflictingCourseId: existingCourseId,
          conflictingCourseName: existing.courseId?.courseName || 'Unknown',
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

// Helper function to generate time slots with different durations
// IMPORTANT: All classes must start at the SAME predefined start times
// Duration only affects the end time, not the start time
// This ensures all classes start at fixed, absolute times (e.g., 9:00 or 9:30, not both)
const generateTimeSlots = (baseTimeSlots, duration) => {
  const slots = [];
  for (const slot of baseTimeSlots) {
    // Handle both formats: '09:00' or '09:00-10:30'
    let startTime;
    if (slot.includes('-')) {
      [startTime] = slot.split('-');
    } else {
      startTime = slot;
    }
    // Calculate end time based on start time + duration
    // All classes starting at the same time will have the same start time
    const endTime = addMinutesToTime(startTime, duration);
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

// Generate timetable automatically
const generateTimetable = async (degreeLevel, academicYear, timeSlots, days, priorities = {}) => {
  // Get all allocations and filter by degree level
  const allocations = await Allocation.find({ status: 'allocated' })
    .populate({
      path: 'courseId',
      match: { degreeLevels: degreeLevel }
    })
    .populate('teacherId');

  // Filter out allocations where course doesn't match degree level
  const filteredAllocations = allocations.filter(allocation => allocation.courseId !== null);

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
  const avoidConsecutiveDays = priorities.avoidConsecutiveDays !== false; // Default to true
  
  // Track all scheduled entries in this batch to prevent duplicates
  const scheduledInCurrentBatch = [];
  
  // Track courses that have been fully scheduled to prevent duplicate scheduling across allocations
  const fullyScheduledCourses = new Set();
  
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
      for (const day of days) {
        if (scheduled) break;

        // Check if teacher can schedule on this day (max 2 classes per day)
        const canSchedule = await canTeacherScheduleOnDay(teacher._id, day, academicYear, null, scheduledInCurrentBatch);
        if (!canSchedule) {
          continue; // Teacher already has 2 classes on this day
        }

        // For courses with multiple classes, try to space them out (e.g., Mon/Wed for 3 credits)
        // But allow if teacher has less than 2 classes on the day
        if (scheduledSlots.length > 0 && allClassesToSchedule.length > 1) {
          // Check if we've already scheduled on this day for this course
          const alreadyScheduledToday = scheduledSlots.some(slot => slot.day === day);
          // Also check if teacher already has classes on this day
          const teacherClassesOnDay = await getTeacherClassesCountOnDay(teacher._id, day, academicYear, null, scheduledInCurrentBatch);
          
          // Allow scheduling on same day if:
          // 1. We haven't scheduled this course on this day yet, OR
          // 2. Teacher has less than 2 classes on this day (can have consecutive classes with 10-min break)
          if (alreadyScheduledToday && teacherClassesOnDay >= 1) {
            // Check if we can still schedule (teacher has room for more classes)
            if (teacherClassesOnDay >= 2) {
              continue; // Teacher already has 2 classes on this day
            }
            // Otherwise, allow consecutive classes for the same course (with 10-min break)
          }
        }

        // Filter out slots that would overlap with already scheduled slots for this course on this day
        // Check within the same academic year first (primary concern)
        const existingCourseTimetablesForDay = await Timetable.find({
          courseId: course._id,
          day,
          academicYear,
          status: 'active'
        });
        
        // Also check across different academic years to prevent overlapping times completely
        const existingCourseTimetablesForDayAllYears = await Timetable.find({
          courseId: course._id,
          day,
          status: 'active',
          academicYear: { $ne: academicYear }
        });
        
        const allExistingForDay = [...existingCourseTimetablesForDay, ...existingCourseTimetablesForDayAllYears];
        
        const filteredSlots = filterOverlappingSlots(
          availableSlots,
          course._id,
          day,
          scheduledSlots,
          scheduledInCurrentBatch,
          allExistingForDay
        );
        
        for (const slot of filteredSlots) {
          if (scheduled) break;

          let { startTime, endTime } = slot;
          
          // Check if this start time conflicts with any existing scheduled classes for this teacher
          // If a teacher has a class ending at 10:30, next class should start at 10:40 (10-minute break)
          const teacherExistingClasses = await Timetable.find({
            teacherId: teacher._id,
            day,
            academicYear,
            status: 'active'
          });
          
          // Also check scheduledInCurrentBatch
          const teacherScheduledInBatch = scheduledInCurrentBatch.filter(s => 
            s.teacherId && (s.teacherId.toString() === teacher._id.toString() || (s.teacherId._id && s.teacherId._id.toString() === teacher._id.toString())) &&
            s.day === day
          );
          
          const allTeacherClasses = [...teacherExistingClasses, ...teacherScheduledInBatch];
          
          // Check if startTime violates 10-minute break rule
          let violatesBreakRule = false;
          for (const existingClass of allTeacherClasses) {
            const existingEndTime = existingClass.endTime;
            const [h1, m1] = startTime.split(':').map(Number);
            const [h2, m2] = existingEndTime.split(':').map(Number);
            const startMinutes = h1 * 60 + m1;
            const endMinutes = h2 * 60 + m2;
            
            // If new class starts before existing class ends + 10 minutes, it violates break rule
            if (startMinutes < endMinutes + 10) {
              violatesBreakRule = true;
              break;
            }
          }
          
          if (violatesBreakRule) {
            continue; // Skip this slot - violates 10-minute break rule
          }

          // Find available classroom
          for (const classRoom of classes) {
            if (scheduled) break;

            // Check if classroom capacity is sufficient
            const registrations = await Registration.countDocuments({
              courseId: course._id,
              status: 'registered'
            });

            if (classRoom.capacity < registrations) {
              continue;
            }

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
            
            // Also check database for overlapping times for this course
            // Check same day and academic year first (most common case)
            const existingCourseTimetables = await Timetable.find({
              courseId: course._id,
              day,
              academicYear,
              status: 'active'
            });
            
            let hasOverlappingInDB = false;
            for (const existing of existingCourseTimetables) {
              if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                hasOverlappingInDB = true;
                break;
              }
            }
            
            // Also check for overlapping times on the same day across different academic years
            // This prevents scheduling the same course at overlapping times (e.g., 9:00-10:30 and 9:30-11:00)
            if (!hasOverlappingInDB) {
              const existingCourseTimetablesSameDay = await Timetable.find({
                courseId: course._id,
                day,
                status: 'active',
                academicYear: { $ne: academicYear } // Different academic year but same day
              });
              
              for (const existing of existingCourseTimetablesSameDay) {
                if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                  hasOverlappingInDB = true;
                  break;
                }
              }
            }
            
            if (hasOverlappingInDB) {
              continue; // Course already has overlapping class in database, skip this slot
            }

            // Check conflicts (use course semester for conflict checking)
            const conflicts = await checkConflictsSimple(
              course._id,
              teacher._id,
              classRoom._id,
              day,
              startTime,
              endTime,
              course.semester, // Use course semester
              academicYear,
              null, // excludeId
              scheduledInCurrentBatch // Pass current batch to prevent duplicates
            );

            // CRITICAL: Student conflicts must be zero - do not schedule if students have conflicts
            // Also check for duplicate course scheduling (same course at overlapping times)
            // Teacher and classroom conflicts are also avoided but can be resolved later
            if (conflicts.student.length === 0 && 
                conflicts.teacher.length === 0 && 
                conflicts.classroom.length === 0 &&
                conflicts.duplicate.length === 0) {
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

        for (const day of days) {
          // Check if teacher can schedule on this day (max 2 classes per day)
          const canSchedule = await canTeacherScheduleOnDay(teacher._id, day, academicYear, null, scheduledInCurrentBatch);
          if (!canSchedule) {
            continue; // Teacher already has 2 classes on this day
          }

          // For courses with multiple classes, try to space them out
          // But allow consecutive classes if teacher has room
          if (scheduledSlots.length > 0 && allClassesToSchedule.length > 1) {
            const alreadyScheduledToday = scheduledSlots.some(slot => slot.day === day);
            const teacherClassesOnDay = await getTeacherClassesCountOnDay(teacher._id, day, academicYear, null, scheduledInCurrentBatch);
            
            if (alreadyScheduledToday && teacherClassesOnDay >= 2) {
              continue; // Teacher already has 2 classes on this day
            }
          }

          // Filter out slots that would overlap with already scheduled slots for this course on this day
          // Check within the same academic year first (primary concern)
          const existingCourseTimetablesForDayFallback = await Timetable.find({
            courseId: course._id,
            day,
            academicYear,
            status: 'active'
          });
          
          // Also check across different academic years to prevent overlapping times completely
          const existingCourseTimetablesForDayAllYearsFallback = await Timetable.find({
            courseId: course._id,
            day,
            status: 'active',
            academicYear: { $ne: academicYear }
          });
          
          const allExistingForDayFallback = [...existingCourseTimetablesForDayFallback, ...existingCourseTimetablesForDayAllYearsFallback];
          
          const filteredSlotsFallback = filterOverlappingSlots(
            availableSlots,
            course._id,
            day,
            scheduledSlots,
            scheduledInCurrentBatch,
            allExistingForDayFallback
          );
          
          for (const slot of filteredSlotsFallback) {
            let { startTime, endTime } = slot;
            const slotKey = `${day}-${startTime}-${endTime}`;
            
            // Skip if already scheduled
            if (scheduledSlots.some(s => s.slotKey === slotKey)) {
              continue;
            }
            
            // Check 10-minute break rule for teacher
            const teacherExistingClasses = await Timetable.find({
              teacherId: teacher._id,
              day,
              academicYear,
              status: 'active'
            });
            
            const teacherScheduledInBatch = scheduledInCurrentBatch.filter(s => 
              s.teacherId && (s.teacherId.toString() === teacher._id.toString() || (s.teacherId._id && s.teacherId._id.toString() === teacher._id.toString())) &&
              s.day === day
            );
            
            const allTeacherClasses = [...teacherExistingClasses, ...teacherScheduledInBatch];
            
            // Check if startTime violates 10-minute break rule
            let violatesBreakRule = false;
            for (const existingClass of allTeacherClasses) {
              const existingEndTime = existingClass.endTime;
              const [h1, m1] = startTime.split(':').map(Number);
              const [h2, m2] = existingEndTime.split(':').map(Number);
              const startMinutes = h1 * 60 + m1;
              const endMinutes = h2 * 60 + m2;
              
              // If new class starts before existing class ends + 10 minutes, it violates break rule
              if (startMinutes < endMinutes + 10) {
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
            
            // Also check database for overlapping times for this course
            // Check same day and academic year first (most common case)
            const existingCourseTimetables = await Timetable.find({
              courseId: course._id,
              day,
              academicYear,
              status: 'active'
            });
            
            let hasOverlappingInDB = false;
            for (const existing of existingCourseTimetables) {
              if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                hasOverlappingInDB = true;
                break;
              }
            }
            
            // Also check for overlapping times on the same day across different academic years
            // This prevents scheduling the same course at overlapping times (e.g., 9:00-10:30 and 9:30-11:00)
            if (!hasOverlappingInDB) {
              const existingCourseTimetablesSameDay = await Timetable.find({
                courseId: course._id,
                day,
                status: 'active',
                academicYear: { $ne: academicYear } // Different academic year but same day
              });
              
              for (const existing of existingCourseTimetablesSameDay) {
                if (timeOverlaps(startTime, endTime, existing.startTime, existing.endTime)) {
                  hasOverlappingInDB = true;
                  break;
                }
              }
            }
            
            if (hasOverlappingInDB) {
              continue; // Course already has overlapping class in database, skip this slot
            }

            for (const classRoom of classes) {
              const registrations = await Registration.countDocuments({
                courseId: course._id,
                status: 'registered'
              });

              if (classRoom.capacity < registrations) {
                continue;
              }

              const conflicts = await checkConflictsSimple(
                course._id,
                teacher._id,
                classRoom._id,
                day,
                startTime,
                endTime,
                course.semester, // Use course semester
                academicYear,
                null, // excludeId
                scheduledInCurrentBatch // Pass current batch to prevent duplicates
              );

              // CRITICAL: Only consider slots with ZERO student conflicts and no duplicates
              if (conflicts.student.length > 0 || conflicts.duplicate.length > 0) {
                continue; // Skip this slot - student conflicts and duplicates are not acceptable
              }

              // Weight conflicts: Teacher conflicts (weight 5), classroom (weight 1)
              // Student conflicts already filtered out above
              const totalConflicts = (conflicts.teacher.length * 5) + conflicts.classroom.length;

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

        // Only schedule if we found a slot with zero student conflicts and no duplicates
        if (bestSlot && bestSlot.conflicts.student.length === 0 && bestSlot.conflicts.duplicate.length === 0) {
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

