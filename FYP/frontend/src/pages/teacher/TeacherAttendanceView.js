import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../student/StudentPages.css';

const getTodayDateInput = () => new Date().toISOString().slice(0, 10);

const TeacherAttendanceView = () => {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(getTodayDateInput());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullSheet, setShowFullSheet] = useState(false);

  const activeCourse = useMemo(
    () => courses.find((c) => c.course?._id === activeCourseId) || null,
    [courses, activeCourseId]
  );

  const selectedDateRows = useMemo(() => {
    if (!activeCourse || !sessionDate) return [];
    const rows = [];
    (activeCourse.students || []).forEach((studentRow) => {
      (studentRow.attendanceSessions || []).forEach((session) => {
        const key = new Date(session.sessionDate).toISOString().slice(0, 10);
        if (key === sessionDate) {
          rows.push({
            registrationId: studentRow.registrationId,
            registrationNo: studentRow.student?.registrationNo,
            studentName: studentRow.student?.name,
            status: session.status
          });
        }
      });
    });
    return rows.sort((a, b) => (a.registrationNo || '').localeCompare(b.registrationNo || ''));
  }, [activeCourse, sessionDate]);

  const allSessionDates = useMemo(() => {
    if (!activeCourse) return [];
    const dates = new Set();
    (activeCourse.students || [])
      .filter((studentRow) => studentRow.status === 'registered')
      .forEach((studentRow) => {
      (studentRow.attendanceSessions || []).forEach((session) => {
        const key = new Date(session.sessionDate).toISOString().slice(0, 10);
        dates.add(key);
      });
    });
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [activeCourse]);

  const fullSheetRows = useMemo(() => {
    if (!activeCourse) return [];
    return (activeCourse.students || [])
      .filter((studentRow) => studentRow.status === 'registered')
      .map((studentRow) => {
        const byDate = {};
        (studentRow.attendanceSessions || []).forEach((session) => {
          const key = new Date(session.sessionDate).toISOString().slice(0, 10);
          byDate[key] = session.status;
        });
        const summary = studentRow.attendanceSummary || {};
        return {
          registrationId: studentRow.registrationId,
          registrationNo: studentRow.student?.registrationNo,
          studentName: studentRow.student?.name,
          byDate,
          presentCount: summary.presentCount || 0,
          totalSessions: summary.totalSessions || 0,
          percentage: summary.percentage || 0
        };
      })
      .sort((a, b) => (a.registrationNo || '').localeCompare(b.registrationNo || ''));
  }, [activeCourse]);

  const summary = useMemo(() => {
    const presentCount = selectedDateRows.filter((r) => r.status === 'present').length;
    const absentCount = selectedDateRows.length - presentCount;
    return { presentCount, absentCount, total: selectedDateRows.length };
  }, [selectedDateRows]);

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
        setActiveCourseId((prev) => prev || list[0].course?._id || '');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h1>View Attendance</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowFullSheet((prev) => !prev)}
          >
            {showFullSheet ? 'Hide Full Attendance' : 'Show Full Attendance'}
          </button>
          <button className="btn btn-secondary" onClick={loadCourses}>Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {courses.length === 0 ? (
        <p className="no-data">No allocated courses found for your account.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '10px', alignItems: 'end' }}>
              <div className="form-group">
                <label>Subject</label>
                <select value={activeCourseId} onChange={(e) => setActiveCourseId(e.target.value)}>
                  {courses.map((item) => (
                    <option key={item.course?._id} value={item.course?._id}>
                      {item.course?.courseCode} - {item.course?.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!showFullSheet && (
            <div className="card">
              {!activeCourse ? (
                <p className="no-data">Select a subject to view attendance.</p>
              ) : selectedDateRows.length === 0 ? (
                <p className="no-data">
                  No attendance found for {new Date(sessionDate).toLocaleDateString()} in this subject.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>
                      {activeCourse.course?.courseCode} - {activeCourse.course?.courseName}
                    </h2>
                    <div style={{ color: '#475569', fontWeight: 600 }}>
                      Date: {new Date(sessionDate).toLocaleDateString()} • Present: {summary.presentCount} • Absent: {summary.absentCount} • Total: {summary.total}
                    </div>
                  </div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Reg No</th>
                          <th>Student</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDateRows.map((row) => (
                          <tr key={`${row.registrationId}-${sessionDate}`}>
                            <td>{row.registrationNo}</td>
                            <td>{row.studentName}</td>
                            <td>
                              <span className={`status-badge ${row.status === 'present' ? 'allocated' : 'deallocated'}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {showFullSheet && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h2 style={{ marginTop: 0 }}>Full Attendance Sheet (Excel Style)</h2>
              {!activeCourse ? (
                <p className="no-data">Select a subject to view full attendance sheet.</p>
              ) : allSessionDates.length === 0 ? (
                <p className="no-data">No sessions have been marked yet for this subject.</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Reg No</th>
                        <th>Name</th>
                        {allSessionDates.map((dateKey) => (
                          <th key={dateKey}>{new Date(dateKey).toLocaleDateString()}</th>
                        ))}
                        <th>Present</th>
                        <th>Total</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullSheetRows.map((row) => (
                        <tr key={row.registrationId}>
                          <td>{row.registrationNo}</td>
                          <td>{row.studentName}</td>
                          {allSessionDates.map((dateKey) => {
                            const status = row.byDate[dateKey];
                            if (!status) return <td key={`${row.registrationId}-${dateKey}`}>-</td>;
                            return (
                              <td key={`${row.registrationId}-${dateKey}`}>
                                <span className={`status-badge ${status === 'present' ? 'allocated' : 'deallocated'}`}>
                                  {status === 'present' ? 'P' : 'A'}
                                </span>
                              </td>
                            );
                          })}
                          <td>{row.presentCount}</td>
                          <td>{row.totalSessions}</td>
                          <td>{row.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherAttendanceView;
