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

  useEffect(() => {
    loadTimetable();
  }, []);

  useEffect(() => {
    detectConflicts();
  }, [timetable]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load all timetables for all semesters - no filters
      const response = await api.get('/timetable');
      
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
  
  // Format time range for display: "9:00 to 10:30"
  const formatTimeRange = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes}`;
    };
    return `${formatSingleTime(startTime)} to ${formatSingleTime(endTime)}`;
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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <h1>Timetable</h1>
      
      {error && (
        <div className="alert alert-error">{error}</div>
      )}
      
      {conflicts.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <strong>⚠️ Schedule Conflicts Detected:</strong>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            {conflicts.map((conflict, idx) => (
              <li key={idx}>
                <strong>{conflict.course1}</strong> ({conflict.time1}) conflicts with <strong>{conflict.course2}</strong> ({conflict.time2}) on {conflict.day}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '10px', marginBottom: 0, fontSize: '14px' }}>
            Please contact the administrator to resolve these conflicts.
          </p>
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
                  <th key={`${timeRange.startTime}-${timeRange.endTime}`} className="time-header" title={formatTimeRange(timeRange.startTime, timeRange.endTime)}>
                    {formatTimeRange(timeRange.startTime, timeRange.endTime)}
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
                              return (
                                <div 
                                  key={idx}
                                  className={`timetable-entry ${hasConflictForEntry ? 'conflict' : ''}`} 
                                  title={`${entry.courseId?.courseCode || 'N/A'} - ${entry.courseId?.courseName || 'N/A'} | ${entry.teacherId?.name || 'N/A'} | ${entry.classId?.className || 'N/A'} | ${formatTimeRange(entry.startTime, entry.endTime)}`}
                                  style={{ marginBottom: entries.length > 1 ? '2px' : '0' }}
                                >
                                  {hasConflictForEntry && <span className="conflict-badge" style={{ fontSize: '8px' }}>⚠️</span>}
                                  <strong>{entry.courseId?.courseCode || 'N/A'}</strong>
                                  <small style={{ fontSize: '7px', color: '#888' }}>
                                    {formatTimeRange(entry.startTime, entry.endTime)}
                                  </small>
                                  <small style={{ color: '#666', fontSize: '7px', maxWidth: '100%' }}>
                                    {entry.courseId?.courseName && entry.courseId.courseName.length > 12 
                                      ? entry.courseId.courseName.substring(0, 12) + '...' 
                                      : (entry.courseId?.courseName || 'N/A')}
                                  </small>
                                  <small style={{ fontSize: '7px', color: '#999', fontWeight: '500' }}>
                                    {entry.teacherId?.name || 'N/A'}
                                  </small>
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










