import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './StudentPages.css';
import { Lightbulb, AlertTriangle } from 'lucide-react';

const StudentTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [filterMyCourses, setFilterMyCourses] = useState(false);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);

  useEffect(() => {
    loadRegisteredCourses();
    loadTimetable();
  }, [filterMyCourses]);

  useEffect(() => {
    detectConflicts();
  }, [timetable]);

  const loadRegisteredCourses = async () => {
    try {
      const response = await api.get('/registrations');
      if (response.data.success) {
        const activeRegs = (response.data.registrations || []).filter(
          (reg) => reg.status === 'registered'
        );
        const uniqueCourseIds = Array.from(
          new Set(
            activeRegs
              .map((reg) => reg.courseId?._id || reg.courseId)
              .filter(Boolean)
              .map((id) => id.toString())
          )
        );
        const courseIds = uniqueCourseIds;
        setRegisteredCourseIds(courseIds);
      }
    } catch (error) {
      console.error('Failed to load registered courses:', error);
    }
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load timetables - filter by registered courses if filterMyCourses is true
      const url = filterMyCourses 
        ? '/timetable?filterMyCourses=true'
        : '/timetable';
      const response = await api.get(url);
      
      console.log('Timetable API Response:', response.data);
      
      if (response.data.success) {
        const timetables = response.data.timetables || [];
        console.log(`[Frontend] Loaded ${timetables.length} timetable entries`);
        console.log(`[Frontend] Response data:`, response.data);
        console.log('[Frontend] Timetable entries:', timetables.map(t => ({
          id: t._id,
          course: t.courseId?.courseCode || t.courseId?.courseName || 'N/A',
          courseId: t.courseId?._id || t.courseId || 'N/A',
          day: t.day,
          time: `${t.startTime}-${t.endTime}`,
          teacher: t.teacherId?.name || 'N/A',
          academicYear: t.academicYear,
          semester: t.semester
        })));
        
        // Filter out entries with missing required data
        const validTimetables = timetables.filter(t => {
          const isValid = t.courseId && t.teacherId && t.classId && t.day && t.startTime && t.endTime;
          if (!isValid) {
            console.warn('[Frontend] Filtered out invalid timetable entry:', t);
          }
          return isValid;
        });
        
        console.log(`[Frontend] Valid timetable entries after filtering: ${validTimetables.length}`);
        setTimetable(validTimetables);
        
        if (validTimetables.length === 0) {
          if (timetables.length > 0) {
            setError(`Found ${timetables.length} timetable entries but they are missing required data. Please contact administrator.`);
          } else {
            setError('No timetable available. The timetable will be visible once the administrator generates it.');
          }
        }
      } else {
        setError(response.data.message || 'Failed to load timetable');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load timetable';
      setError(errorMessage);
      console.error('Timetable loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectConflicts = () => {
    const detectedConflicts = [];
    
    // Only check conflicts for courses the student is registered for
    const registeredEntries = timetable.filter(entry => {
      if (!entry.courseId) return false;
      const courseId = entry.courseId._id || entry.courseId;
      return registeredCourseIds.some(id => id?.toString() === courseId?.toString());
    });

    // Group registered entries by day
    const timeMap = {};
    registeredEntries.forEach(entry => {
      const day = entry.day;
      if (!timeMap[day]) {
        timeMap[day] = [];
      }
      timeMap[day].push(entry);
    });

    // Check for student conflicts: same student registered for overlapping courses
    Object.keys(timeMap).forEach(day => {
      const entries = timeMap[day];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const entry1 = entries[i];
          const entry2 = entries[j];
          
          // Check if times overlap
          if (timeOverlaps(entry1.startTime, entry1.endTime, entry2.startTime, entry2.endTime)) {
            // Both courses are registered by the student - this is a student conflict
            if (entry1.courseId && entry2.courseId) {
              detectedConflicts.push({
                type: 'student',
                course1: entry1.courseId.courseName || entry1.courseId.courseCode || 'Unknown',
                course2: entry2.courseId.courseName || entry2.courseId.courseCode || 'Unknown',
                day: day,
                time1: `${entry1.startTime}-${entry1.endTime}`,
                time2: `${entry2.startTime}-${entry2.endTime}`
              });
            }
          }
        }
      }
    });

    // Check for teacher conflicts: same teacher teaching multiple courses at the same time
    // Check all timetable entries (not just registered ones) for teacher conflicts
    const teacherTimeMap = {};
    timetable.forEach(entry => {
      if (!entry.teacherId || !entry.teacherId._id) return;
      const teacherId = entry.teacherId._id.toString();
      const day = entry.day;
      const key = `${day}-${teacherId}`;
      if (!teacherTimeMap[key]) {
        teacherTimeMap[key] = [];
      }
      teacherTimeMap[key].push(entry);
    });

    Object.keys(teacherTimeMap).forEach(key => {
      const entries = teacherTimeMap[key];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const entry1 = entries[i];
          const entry2 = entries[j];
          
          // Check if times overlap
          if (timeOverlaps(entry1.startTime, entry1.endTime, entry2.startTime, entry2.endTime)) {
            // Same teacher teaching at overlapping times - this is a teacher conflict
            if (entry1.courseId && entry2.courseId && entry1.teacherId && entry2.teacherId) {
              detectedConflicts.push({
                type: 'teacher',
                course1: entry1.courseId.courseName || entry1.courseId.courseCode || 'Unknown',
                course2: entry2.courseId.courseName || entry2.courseId.courseCode || 'Unknown',
                teacher: entry1.teacherId.name || 'Unknown',
                teacherId: entry1.teacherId._id.toString(),
                day: entry1.day,
                time1: `${entry1.startTime}-${entry1.endTime}`,
                time2: `${entry2.startTime}-${entry2.endTime}`
              });
            }
          }
        }
      }
    });

    setConflicts(detectedConflicts);
  };

  const timeOverlaps = (start1, end1, start2, end2) => {
    const parseTime = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const start1Min = parseTime(start1);
    const end1Min = parseTime(end1);
    const start2Min = parseTime(start2);
    const end2Min = parseTime(end2);

    return start1Min < end2Min && end1Min > start2Min;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Format time range for display: "9:00-10:30" (more compact)
  const formatTimeRange = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes}`;
    };
    return `${formatSingleTime(startTime)}-${formatSingleTime(endTime)}`;
  };
  
  // Format time range for header: "9:00 TO 10:30"
  const formatTimeRangeHeader = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes}`;
    };
    return `${formatSingleTime(startTime)} TO ${formatSingleTime(endTime)}`;
  };

  // Extract unique time ranges from timetable entries
  const getUniqueTimeRanges = () => {
    // Always render official slots so "free" periods are visible.
    return [
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '10:30', endTime: '12:00' },
      { startTime: '12:00', endTime: '13:30' },
      { startTime: '14:00', endTime: '15:30' },
      { startTime: '15:30', endTime: '17:00' }
    ];
  };

  const timeRanges = getUniqueTimeRanges();

  const getTimetableEntries = (day, timeRange) => {
    // Find ALL entries that match the day and exact time range
    // This handles cases where multiple courses might be at the same time (shouldn't happen, but handle gracefully)
    return timetable.filter(entry => {
      if (entry.day !== day) return false;
      return entry.startTime === timeRange.startTime && entry.endTime === timeRange.endTime;
    });
  };

  const hasConflict = (entry) => {
    if (!entry.courseId) return false;
    const courseId = entry.courseId._id || entry.courseId;
    const courseName = entry.courseId.courseName || entry.courseId.courseCode || '';
    const isRegistered = registeredCourseIds.some(id => id?.toString() === courseId?.toString());
    
    // Check student conflicts: only if this course is registered by the student
    if (isRegistered) {
      const studentConflict = conflicts.some(conflict => 
        conflict.type === 'student' &&
        (conflict.course1 === courseName || conflict.course2 === courseName) &&
        conflict.day === entry.day
      );
      if (studentConflict) return true;
    }
    
    // Check teacher conflicts: if same teacher has overlapping classes
    if (entry.teacherId && entry.teacherId._id) {
      const teacherId = entry.teacherId._id.toString();
      const teacherConflict = conflicts.some(conflict => 
        conflict.type === 'teacher' &&
        conflict.teacherId === teacherId &&
        (conflict.course1 === courseName || conflict.course2 === courseName) &&
        conflict.day === entry.day
      );
      if (teacherConflict) return true;
    }
    
    return false;
  };

  const isRegisteredCourse = (entry) => {
    if (!entry.courseId) return false;
    const courseId = entry.courseId._id || entry.courseId;
    return registeredCourseIds.some(id => 
      id?.toString() === courseId?.toString()
    );
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container timetable-page" style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Timetable</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterMyCourses}
            onChange={(e) => setFilterMyCourses(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Show only my courses</span>
        </label>
      </div>
      
      {!filterMyCourses && registeredCourseIds.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom: '10px', fontSize: '11px', padding: '8px' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={16} /> Tip:
          </strong> Your registered courses have <span style={{ border: '2px solid #dc3545', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: 'white' }}>red borders</span>.
        </div>
      )}
      
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '10px', padding: '8px', fontSize: '12px' }}>{error}</div>
      )}
      
      {conflicts.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '10px', padding: '8px', fontSize: '11px' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} /> Conflicts:
          </strong> {conflicts.length} conflict(s) detected.
          <ul style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
            {conflicts.map((conflict, idx) => (
              <li key={idx} style={{ fontSize: '10px', marginBottom: '3px' }}>
                {conflict.type === 'student' 
                  ? `You are registered for "${conflict.course1}" and "${conflict.course2}" at the same time (${conflict.day}, ${conflict.time1})`
                  : `Teacher "${conflict.teacher}" has classes "${conflict.course1}" and "${conflict.course2}" at the same time (${conflict.day}, ${conflict.time1})`
                }
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {timetable.length === 0 && !loading ? (
        <p className="no-data">{error || 'No timetable available. The timetable will be visible once the administrator generates it.'}</p>
      ) : (
        <div className="timetable-container">
          <table className="timetable-table">
            <thead>
              <tr>
                <th className="day-cell">Day</th>
                {timeRanges.map((timeRange, index) => (
                  <th key={`${timeRange.startTime}-${timeRange.endTime}`} className="time-header" title={formatTimeRangeHeader(timeRange.startTime, timeRange.endTime)}>
                    {formatTimeRangeHeader(timeRange.startTime, timeRange.endTime)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day}>
                  <td className="day-cell">{day}</td>
                  {timeRanges.map((timeRange) => {
                    const entries = getTimetableEntries(day, timeRange);
                    return (
                      <td key={`${timeRange.startTime}-${timeRange.endTime}`} className={entries.length > 0 ? `timetable-cell filled` : 'timetable-cell'}>
                        {entries.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {entries.map((entry, idx) => {
                              const hasConflictForEntry = hasConflict(entry);
                              const isRegistered = isRegisteredCourse(entry);
                              const courseName = entry.courseId?.courseName || 'N/A';
                              const truncatedName = courseName.length > 12 
                                ? courseName.substring(0, 12) + '...' 
                                : courseName;
                              
                              return (
                                <div 
                                  key={idx}
                                  className={`timetable-entry ${isRegistered ? 'registered-course' : ''} ${hasConflictForEntry ? 'has-conflict' : ''}`}
                                  title={`${entry.courseId?.courseCode || 'N/A'} - ${entry.courseId?.courseName || 'N/A'} | ${entry.teacherId?.name || 'N/A'} | ${entry.classId?.className || 'N/A'} | ${formatTimeRange(entry.startTime, entry.endTime)}${isRegistered ? ' (Your Course)' : ''}${hasConflictForEntry ? ' - CONFLICT DETECTED' : ''}`}
                                  style={{ 
                                    marginBottom: entries.length > 1 ? '4px' : '0',
                                    transition: 'none',
                                    animation: 'none',
                                    transform: 'none',
                                    willChange: 'auto'
                                  }}
                                >
                                  <div className="timetable-entry-header">
                                    {hasConflictForEntry && (
                                      <AlertTriangle className="warning-icon" size={14} title="Schedule conflict detected" />
                                    )}
                                    <strong className="course-code">{entry.courseId?.courseCode || 'N/A'}</strong>
                                  </div>
                                  <div className="timetable-entry-time">
                                    {formatTimeRange(entry.startTime, entry.endTime)}
                                  </div>
                                  <div className="timetable-entry-title">
                                    {truncatedName}
                                  </div>
                                  <div className="timetable-entry-instructor">
                                    {entry.teacherId?.name || 'N/A'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;










