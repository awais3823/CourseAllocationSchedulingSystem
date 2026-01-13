import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../student/StudentPages.css';

const TeacherTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/timetable?teacherId=${user.id}`);
      setTimetable(response.data.timetables);
    } catch (error) {
      setError('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getTimetableEntry = (day, time) => {
    return timetable.find(
      entry => entry.day === day && entry.startTime.startsWith(time)
    );
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <h1>My Teaching Schedule</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {timetable.length === 0 ? (
        <p className="no-data">No timetable available. Courses need to be allocated and scheduled.</p>
      ) : (
        <div className="timetable-container">
          <table className="timetable-table">
            <thead>
              <tr>
                <th>Time</th>
                {days.map(day => (
                  <th key={day}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="time-cell">{time}</td>
                  {days.map(day => {
                    const entry = getTimetableEntry(day, time);
                    return (
                      <td key={day} className={entry ? 'timetable-cell filled' : 'timetable-cell'}>
                        {entry && (
                          <div className="timetable-entry">
                            <strong>{entry.courseId.courseCode}</strong>
                            <br />
                            {entry.courseId.courseName}
                            <br />
                            <small>{entry.classId.className}</small>
                            <br />
                            <small>{entry.startTime} - {entry.endTime}</small>
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













