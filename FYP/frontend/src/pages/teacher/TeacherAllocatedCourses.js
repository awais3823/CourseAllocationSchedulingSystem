import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import '../student/StudentPages.css';

const TeacherAllocatedCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    const totalCourses = courses.length;
    const totalRegisteredStudents = courses.reduce(
      (sum, c) => sum + (c.students || []).filter((s) => s.status === 'registered').length,
      0
    );
    return { totalCourses, totalRegisteredStudents };
  }, [courses]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/attendance/teacher/courses', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      setCourses(res.data?.courses || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load allocated courses');
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
        <h1>My Allocated Courses</h1>
        <button className="btn btn-secondary" onClick={loadCourses}>Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {courses.length === 0 ? (
        <p className="no-data">No allocated courses found for your account.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <strong>Total Courses:</strong> {totals.totalCourses}
            </div>
            <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #4f46e5', borderRadius: '8px', background: '#eef2ff' }}>
              <strong>Total Registered Students:</strong> {totals.totalRegisteredStudents}
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Course Details</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Semester</th>
                    <th>Credits</th>
                    <th>Program</th>
                    <th>Registered Students</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((item) => {
                    const registeredCount = (item.students || []).filter((s) => s.status === 'registered').length;
                    return (
                      <tr key={item.course?._id}>
                        <td>{item.course?.courseCode}</td>
                        <td>{item.course?.courseName}</td>
                        <td>{item.course?.semester}</td>
                        <td>{item.course?.credits}</td>
                        <td>{item.course?.program}</td>
                        <td>{registeredCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherAllocatedCourses;
