import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './StudentPages.css';

const StudentAttendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedCourse = useMemo(
    () => attendance.find((item) => item.course?._id === selectedCourseId) || null,
    [attendance, selectedCourseId]
  );

  const fullSheetDates = useMemo(() => {
    const sessions = selectedCourse?.attendanceSessions || [];
    return sessions
      .map((s) => new Date(s.sessionDate).toISOString().slice(0, 10))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [selectedCourse]);

  const attendanceByDate = useMemo(() => {
    const map = {};
    (selectedCourse?.attendanceSessions || []).forEach((s) => {
      const key = new Date(s.sessionDate).toISOString().slice(0, 10);
      map[key] = s.status;
    });
    return map;
  }, [selectedCourse]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/attendance/me', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const list = res.data?.attendance || [];
      setAttendance(list);
      if (list.length > 0) {
        setSelectedCourseId((prev) => prev || list[0].course?._id || '');
      } else {
        setSelectedCourseId('');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h1>My Attendance</h1>
        <button className="btn btn-secondary" onClick={loadAttendance}>Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {attendance.length === 0 ? (
        <p className="no-data">No registered courses found for attendance.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', alignItems: 'end' }}>
              <div className="form-group">
                <label>Registered Course</label>
                <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                  {attendance.map((item) => (
                    <option key={item.course?._id} value={item.course?._id}>
                      {item.course?.courseCode} - {item.course?.courseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedCourse ? (
            <p className="no-data">Select a course to view attendance.</p>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '16px' }}>
                <h2 style={{ marginTop: 0 }}>
                  {selectedCourse.course?.courseCode} - {selectedCourse.course?.courseName}
                </h2>
                <p style={{ marginTop: '-8px', color: '#475569' }}>
                  Semester {selectedCourse.course?.semester} • {selectedCourse.course?.program}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <strong>Present:</strong> {selectedCourse.attendanceSummary?.presentCount || 0}
                  </div>
                  <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <strong>Absent:</strong> {selectedCourse.attendanceSummary?.absentCount || 0}
                  </div>
                  <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <strong>Total Sessions:</strong> {selectedCourse.attendanceSummary?.totalSessions || 0}
                  </div>
                  <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #4f46e5', borderRadius: '8px', background: '#eef2ff' }}>
                    <strong>Attendance %:</strong> {selectedCourse.attendanceSummary?.percentage || 0}%
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 style={{ marginTop: 0 }}>Attendance Sheet (Excel Style)</h2>
                {fullSheetDates.length === 0 ? (
                  <p className="no-data">No attendance sessions marked yet for this course.</p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Reg No</th>
                          <th>Name</th>
                          {fullSheetDates.map((d) => (
                            <th key={d}>{new Date(d).toLocaleDateString()}</th>
                          ))}
                          <th>Present</th>
                          <th>Total</th>
                          <th>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{user?.registrationNo || 'You'}</td>
                          <td>{user?.name || 'Current Student'}</td>
                          {fullSheetDates.map((d) => (
                            <td key={d}>
                              <span className={`status-badge ${attendanceByDate[d] === 'present' ? 'allocated' : 'deallocated'}`}>
                                {attendanceByDate[d] === 'present' ? 'P' : 'A'}
                              </span>
                            </td>
                          ))}
                          <td>{selectedCourse.attendanceSummary?.presentCount || 0}</td>
                          <td>{selectedCourse.attendanceSummary?.totalSessions || 0}</td>
                          <td>{selectedCourse.attendanceSummary?.percentage || 0}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StudentAttendance;
