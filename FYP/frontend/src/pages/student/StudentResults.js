import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import './StudentPages.css';

const StudentResults = () => {
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/results/me');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load results');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const semesterOptions = useMemo(() => {
    const sems = (data?.semesterResults || []).map((s) => s.semester).sort((a, b) => a - b);
    return [...new Set(sems)];
  }, [data]);

  const visibleSemesterResults = useMemo(() => {
    if (!selectedSemester) return data?.semesterResults || [];
    const semNum = Number(selectedSemester);
    return (data?.semesterResults || []).filter((s) => s.semester === semNum);
  }, [data, selectedSemester]);

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>My Results</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="results-semester-select"
          >
            <option value="">All Semesters</option>
            {semesterOptions.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data?.semesterResults || data.semesterResults.length === 0 ? (
        <p className="no-data">No results available yet.</p>
      ) : (
        <>
          <div style={{
            display: 'flex',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '14px'
          }}>
            <div className="stat-card" style={{
              background: '#eef2ff',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #4f46e5'
            }}>
              <strong>Overall CGPA:</strong> {data.cgpa ?? 0}
            </div>
            <div className="stat-card" style={{
              background: '#f8fafc',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1'
            }}>
              <strong>Grade Scale:</strong> A, A-, B+, B, B-, C+, C, D, F
            </div>
          </div>

          {visibleSemesterResults.length === 0 ? (
            <p className="no-data">No subjects found for selected semester.</p>
          ) : visibleSemesterResults.map((sem) => (
            <div key={sem.semester} style={{ marginBottom: '22px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '6px'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#4f46e5' }}>
                  Semester {sem.semester}
                </h2>
                <div style={{ fontWeight: 700 }}>
                  Semester GPA: {sem.semesterGpa ?? 0}
                </div>
              </div>

              <div className="table-container" style={{ marginTop: '10px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Credits</th>
                      <th>Marks</th>
                      <th>Grade</th>
                      <th>Grade Point</th>
                      <th>Quality Points (GP x Credits)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.courses.map((c) => (
                      <tr key={c.registrationId}>
                        <td><strong>{c.courseCode}</strong></td>
                        <td>{c.courseName}</td>
                        <td>{c.credits}</td>
                        <td>{c.marks}</td>
                        <td>{c.grade}</td>
                        <td>{c.gradePoint}</td>
                        <td>{((Number(c.gradePoint) || 0) * (Number(c.credits) || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default StudentResults;

