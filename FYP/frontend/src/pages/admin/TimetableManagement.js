import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { exportTimetableToCSV } from '../../utils/exportUtils';
import './AdminPages.css';

const TimetableManagement = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateData, setGenerateData] = useState({
    academicYear: '',
    priorities: {
      avoidConsecutiveDays: true // Default: avoid consecutive days for teachers
    }
  });
  const [conflictInfo, setConflictInfo] = useState(null);

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      const response = await api.get('/timetable');
      setTimetable(response.data.timetables);
    } catch (error) {
      setError('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setConflictInfo(null);
      setLoading(true);
      console.log('Generating timetable with data:', generateData);
      const response = await api.post('/timetable/generate', generateData);
      console.log('Timetable generation response:', response.data);
      setSuccess(response.data.message);
      setConflictInfo({
        totalScheduled: response.data.totalScheduled,
        totalConflicts: response.data.totalConflicts,
        unresolvedConflicts: response.data.unresolvedConflicts || []
      });
      setShowGenerateForm(false);
      loadTimetable();
    } catch (error) {
      console.error('Timetable generation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate timetable';
      setError(`Error: ${errorMessage}. ${error.response?.data?.error ? 'Check console for details.' : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/timetable/${id}`);
      setSuccess('Timetable entry deleted successfully');
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete timetable entry');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete the entire timetable? This will delete ALL timetable entries regardless of academic year.')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      // Delete all timetable entries (no academicYear parameter means delete all)
      await api.delete('/timetable');
      setSuccess('All timetable entries deleted successfully');
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete timetable');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Timetable Management</h1>
        <div>
          <button onClick={() => setShowGenerateForm(!showGenerateForm)} className="btn btn-primary">
            Generate Timetable
          </button>
          {timetable.length > 0 && (
            <>
              <button onClick={() => exportTimetableToCSV(timetable)} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                Export to CSV
              </button>
              <button onClick={handleDeleteAll} className="btn btn-danger" style={{ marginLeft: '10px' }}>
                Delete All
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {conflictInfo && conflictInfo.unresolvedConflicts.length > 0 && (
        <div className="alert alert-warning" style={{ marginTop: '15px' }}>
          <strong>⚠️ Unresolved Conflicts Detected:</strong>
          <p>Some courses could not be scheduled without conflicts. Student conflicts are prioritized and avoided.</p>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            {conflictInfo.unresolvedConflicts.map((conflict, idx) => (
              <li key={idx}>
                <strong>{conflict.courseName || conflict.courseId}</strong>
                {conflict.conflicts && (
                  <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                    {conflict.conflicts.student && conflict.conflicts.student.length > 0 && (
                      <li>Student conflicts: {conflict.conflicts.student.length}</li>
                    )}
                    {conflict.conflicts.teacher && conflict.conflicts.teacher.length > 0 && (
                      <li>Teacher conflicts: {conflict.conflicts.teacher.length}</li>
                    )}
                    {conflict.conflicts.classroom && conflict.conflicts.classroom.length > 0 && (
                      <li>Classroom conflicts: {conflict.conflicts.classroom.length}</li>
                    )}
                  </ul>
                )}
                {conflict.message && <span> - {conflict.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showGenerateForm && (
        <div className="card">
          <h2>Generate Timetable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Timetable will be generated for all degree levels (BS, Master, MPhil).
          </p>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label>Academic Year</label>
              <input
                type="text"
                placeholder="e.g., 2024-2025"
                value={generateData.academicYear}
                onChange={(e) => setGenerateData({ ...generateData, academicYear: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label style={{ marginBottom: '12px', display: 'block', fontWeight: 600 }}>
                Scheduling Priorities
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={generateData.priorities.avoidConsecutiveDays}
                    onChange={(e) => setGenerateData({
                      ...generateData,
                      priorities: {
                        ...generateData.priorities,
                        avoidConsecutiveDays: e.target.checked
                      }
                    })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>
                    <strong>Avoid Consecutive Days for Teachers</strong>
                    <br />
                    <small style={{ color: 'var(--text-secondary)' }}>
                      If a teacher has classes on Monday, skip Tuesday to create a gap between teaching days
                    </small>
                  </span>
                </label>
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">Generate Timetable</button>
          </form>
        </div>
      )}

      {timetable.length === 0 ? (
        <p className="no-data">No timetable entries. Generate a timetable to get started.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Teacher</th>
                <th>Classroom</th>
                <th>Day</th>
                <th>Time</th>
                <th>Degree Level</th>
                <th>Semester</th>
                <th>Academic Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map(entry => (
                <tr key={entry._id}>
                  <td>{entry.courseId?.courseCode} - {entry.courseId?.courseName}</td>
                  <td>{entry.teacherId?.name}</td>
                  <td>{entry.classId?.className}</td>
                  <td>{entry.day}</td>
                  <td>{entry.startTime} - {entry.endTime}</td>
                  <td>
                    {entry.courseId?.degreeLevels?.length > 0 
                      ? entry.courseId.degreeLevels.join(', ')
                      : 'N/A'
                    }
                  </td>
                  <td>{entry.semester}</td>
                  <td>{entry.academicYear}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TimetableManagement;










