import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../student/StudentPages.css';
import { Lightbulb } from 'lucide-react';

const TeacherTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMyClasses, setFilterMyClasses] = useState(false);

  useEffect(() => {
    loadTimetable();
  }, [filterMyClasses]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      const url = filterMyClasses
        ? `/timetable?teacherId=${user.id}`
        : '/timetable';
      const response = await api.get(url);

      if (response.data.success) {
        const timetables = response.data.timetables || [];
        const validTimetables = timetables.filter(t => {
          return t.courseId && t.teacherId && t.classId && t.day && t.startTime && t.endTime;
        });
        setTimetable(validTimetables);

        if (validTimetables.length === 0 && timetables.length > 0) {
          setError('Found timetable entries but they are missing required data. Please contact administrator.');
        } else if (timetables.length === 0) {
          setError('No timetable available. Courses need to be allocated and scheduled.');
        }
      } else {
        setError(response.data.message || 'Failed to load timetable');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const isMyClass = (entry) => {
    const teacherId = entry.teacherId?._id || entry.teacherId;
    return teacherId && teacherId.toString() === user.id;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const formatTimeRange = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = (time || '').split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes || '00'}`;
    };
    return `${formatSingleTime(startTime)}-${formatSingleTime(endTime)}`;
  };

  const formatTimeRangeHeader = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = (time || '').split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes || '00'}`;
    };
    return `${formatSingleTime(startTime)} TO ${formatSingleTime(endTime)}`;
  };

  const getUniqueTimeRanges = () => {
    const parseTime = (timeStr) => {
      const [h, m] = (timeStr || '0:0').split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const timeRangeSet = new Set();
    timetable.forEach(entry => {
      timeRangeSet.add(`${entry.startTime}-${entry.endTime}`);
    });

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
    return timetable.filter(entry => {
      if (entry.day !== day) return false;
      return entry.startTime === timeRange.startTime && entry.endTime === timeRange.endTime;
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container timetable-page" style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Timetable</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={filterMyClasses}
            onChange={(e) => setFilterMyClasses(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '12px', fontWeight: '500' }}>Show only my classes</span>
        </label>
      </div>

      {!filterMyClasses && (
        <div className="alert alert-info" style={{ marginBottom: '10px', fontSize: '11px', padding: '8px' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={16} /> Tip:
          </strong> Your classes have <span style={{ border: '2px solid #dc3545', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold', backgroundColor: 'white' }}>red borders</span>.
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '10px', padding: '8px', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {timetable.length === 0 && !loading ? (
        <p className="no-data">{error || 'No timetable available. Courses need to be allocated and scheduled.'}</p>
      ) : (
        <div className="timetable-container">
          <table className="timetable-table">
            <thead>
              <tr>
                <th className="day-cell">Day</th>
                {timeRanges.map((timeRange) => (
                  <th
                    key={`${timeRange.startTime}-${timeRange.endTime}`}
                    className="time-header"
                    title={formatTimeRangeHeader(timeRange.startTime, timeRange.endTime)}
                  >
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
                      <td
                        key={`${timeRange.startTime}-${timeRange.endTime}`}
                        className={entries.length > 0 ? 'timetable-cell filled' : 'timetable-cell'}
                      >
                        {entries.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {entries.map((entry, idx) => {
                              const courseName = entry.courseId?.courseName || 'N/A';
                              const truncatedName = courseName.length > 12
                                ? courseName.substring(0, 12) + '...'
                                : courseName;
                              const myClass = isMyClass(entry);

                              return (
                                <div
                                  key={idx}
                                  className={`timetable-entry ${myClass ? 'registered-course' : ''}`}
                                  title={`${entry.courseId?.courseCode || 'N/A'} - ${entry.courseId?.courseName || 'N/A'} | ${entry.teacherId?.name || 'N/A'} | ${entry.classId?.className || 'N/A'} | ${formatTimeRange(entry.startTime, entry.endTime)}${myClass ? ' (My Class)' : ''}`}
                                  style={{
                                    marginBottom: entries.length > 1 ? '4px' : '0'
                                  }}
                                >
                                  <div className="timetable-entry-header">
                                    <strong className="course-code">
                                      {entry.courseId?.courseCode || 'N/A'}
                                    </strong>
                                  </div>
                                  <div className="timetable-entry-time">
                                    {formatTimeRange(entry.startTime, entry.endTime)}
                                  </div>
                                  <div className="timetable-entry-title">
                                    {truncatedName}
                                  </div>
                                  <div className="timetable-entry-instructor">
                                    {entry.teacherId?.name || 'N/A'} | {entry.classId?.className || 'N/A'} | S{entry.semester || 'N/A'}
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

export default TeacherTimetable;
