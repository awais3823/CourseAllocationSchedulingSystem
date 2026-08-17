import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../student/StudentPages.css';

const getTodayDateInput = () => new Date().toISOString().slice(0, 10);

const TeacherAttendance = () => {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(getTodayDateInput());
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeCourse = useMemo(
    () => courses.find((c) => c.course?._id === activeCourseId) || null,
    [courses, activeCourseId]
  );

  const markableStudents = useMemo(() => {
    if (!activeCourse) return [];
    return (activeCourse.students || []).filter((row) => row.status === 'registered');
  }, [activeCourse]);

  const initializeAttendanceMap = (course) => {
    const initial = {};
    (course?.students || []).forEach((row) => {
      initial[row.registrationId] = 'present';
    });
    setAttendanceMap(initial);
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/attendance/teacher/courses', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const list = res.data?.courses || [];
      setCourses(list);
      if (list.length > 0) {
        const firstId = list[0].course?._id || '';
        setActiveCourseId((prev) => prev || firstId);
        initializeAttendanceMap(list[0]);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load teacher attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (!activeCourse) return;
    initializeAttendanceMap(activeCourse);
  }, [activeCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAttendance = async () => {
    if (!activeCourse || !activeCourse.course?._id) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        sessionDate,
        attendance: markableStudents
          .filter((row) => !row.attendanceLocked)
          .map((row) => ({
            registrationId: row.registrationId,
            status: attendanceMap[row.registrationId] || 'present'
          }))
      };

      if (payload.attendance.length === 0) {
        setError('No active registered students available for attendance marking');
        return;
      }

      const res = await api.post(
        `/attendance/teacher/courses/${activeCourse.course._id}/sessions`,
        payload
      );

      if (res.data?.success) {
        setSuccess(`Attendance saved for ${sessionDate}`);
        await loadCourses();
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h1>Mark Attendance</h1>
        <button className="btn btn-secondary" onClick={loadCourses}>Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {courses.length === 0 ? (
        <p className="no-data">No allocated courses found for your account.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: '10px', alignItems: 'end' }}>
              <div className="form-group">
                <label>Course</label>
                <select
                  value={activeCourseId}
                  onChange={(e) => setActiveCourseId(e.target.value)}
                >
                  {courses.map((item) => (
                    <option key={item.course?._id} value={item.course?._id}>
                      {item.course?.courseCode} - {item.course?.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Session Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleMarkAttendance}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {activeCourse && (
            <>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>
                {activeCourse.course?.courseCode} - {activeCourse.course?.courseName}
              </h2>
              <p style={{ marginTop: '-8px', color: '#475569' }}>
                Semester {activeCourse.course?.semester} • {activeCourse.course?.program}
              </p>

              {markableStudents.length === 0 ? (
                <p className="no-data">No active registered students available for attendance marking.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Reg No</th>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Attendance</th>
                        <th>Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markableStudents.map((row) => {
                        const disabled = row.status !== 'registered' || row.attendanceLocked;
                        const summary = row.attendanceSummary || {};
                        return (
                          <tr key={row.registrationId}>
                            <td>{row.student?.registrationNo}</td>
                            <td>{row.student?.name}</td>
                            <td>
                              <span className={`status-badge ${row.status}`}>
                                {row.status}
                              </span>
                            </td>
                            <td>
                              {disabled ? (
                                <span style={{ color: '#64748b', fontWeight: 600 }}>View only</span>
                              ) : (
                                <select
                                  value={attendanceMap[row.registrationId] || 'present'}
                                  onChange={(e) =>
                                    setAttendanceMap((prev) => ({
                                      ...prev,
                                      [row.registrationId]: e.target.value
                                    }))
                                  }
                                >
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                </select>
                              )}
                            </td>
                            <td>
                              {summary.presentCount || 0}/{summary.totalSessions || 0} (
                              {summary.percentage || 0}%)
                            </td>
                          </tr>
                        );
                      })}
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

export default TeacherAttendance;
