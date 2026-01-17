import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './StudentPages.css';

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
        const courseIds = (response.data.registrations || []).map(reg => 
          reg.courseId?._id || reg.courseId
        );
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
    const timeMap = {};

    // Group timetable entries by day and time
    timetable.forEach(entry => {
      const day = entry.day;
      if (!timeMap[day]) {
        timeMap[day] = [];
      }
      timeMap[day].push(entry);
    });

    // Check for overlapping times on the same day
    Object.keys(timeMap).forEach(day => {
      const entries = timeMap[day];
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const entry1 = entries[i];
          const entry2 = entries[j];
          
          if (timeOverlaps(entry1.startTime, entry1.endTime, entry2.startTime, entry2.endTime)) {
            // Only add conflict if both entries have valid course data
            if (entry1.courseId && entry2.courseId) {
              detectedConflicts.push({
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
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const timeRangeSet = new Set();
    timetable.forEach(entry => {
      const rangeKey = `${entry.startTime}-${entry.endTime}`;
      timeRangeSet.add(rangeKey);
    });

    // Convert to array and sort by start time
    const timeRanges = Array.from(timeRangeSet).map(range => {
      const [startTime, endTime] = range.split('-');
      return { startTime, endTime };
    }).sort((a, b) => {
      const aStart = parseTime(a.startTime);
      const bStart = parseTime(b.startTime);
      return aStart - bStart;
    });

    return timeRanges;
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
    const courseName = entry.courseId.courseName || entry.courseId.courseCode || '';
    return conflicts.some(conflict => 
      (conflict.course1 === courseName || conflict.course2 === courseName) &&
      conflict.day === entry.day
    );
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
    <div className="page-container" style={{ padding: '15px' }}>
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
          <strong>💡 Tip:</strong> Your registered courses have <span style={{ border: '2px solid #dc3545', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: 'white' }}>red borders</span>.
        </div>
      )}
      
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '10px', padding: '8px', fontSize: '12px' }}>{error}</div>
      )}
      
      {conflicts.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '10px', padding: '8px', fontSize: '11px' }}>
          <strong>⚠️ Conflicts:</strong> {conflicts.length} conflict(s) detected. Contact administrator.
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
                                  title={`${entry.courseId?.courseCode || 'N/A'} - ${entry.courseId?.courseName || 'N/A'} | ${entry.teacherId?.name || 'N/A'} | ${entry.classId?.className || 'N/A'} | ${formatTimeRange(entry.startTime, entry.endTime)}${isRegistered ? ' (Your Course)' : ''}`}
                                  style={{ 
                                    marginBottom: entries.length > 1 ? '4px' : '0'
                                  }}
                                >
                                  <div className="timetable-entry-header">
                                    <span className="warning-icon" title={hasConflictForEntry ? "Schedule conflict detected" : "Course information"}>⚠️</span>
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










