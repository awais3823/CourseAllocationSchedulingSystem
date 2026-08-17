import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { MAX_SEMESTER, SEMESTER_OPTIONS } from '../../constants';
import './AdminPages.css';

const calcCgpa = (rows) => {
  const totals = (rows || []).reduce(
    (acc, r) => {
      const credits = Number(r.course?.credits);
      const gp = Number(r.gradePoint);
      if (!Number.isFinite(credits) || credits <= 0) return acc;
      if (!Number.isFinite(gp) || gp < 0) return acc;
      acc.credits += credits;
      acc.points += gp * credits;
      return acc;
    },
    { credits: 0, points: 0 }
  );
  if (totals.credits === 0) return 0;
  return Number((totals.points / totals.credits).toFixed(2));
};

const MarksEntry = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState({});
  const [selectedSemester, setSelectedSemester] = useState('');
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [editingStudentSemester, setEditingStudentSemester] = useState('');
  const [semesterSaveLoading, setSemesterSaveLoading] = useState(false);

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      // Avoid stale caches (IDs change after reseeding)
      const res = await api.get('/results/admin/students', {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      setStudents(res.data.students || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadStudentRegs = async (studentId) => {
    try {
      setLoadingRegs(true);
      const res = await api.get(`/results/admin/students/${studentId}/registrations`, {
        params: { _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const student = res.data.student || null;
      setSelectedStudent(student);
      setEditingStudentSemester(
        student && typeof student.semester === 'number' ? String(student.semester) : ''
      );
      setRegistrations(res.data.registrations || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load registrations');
      setRegistrations([]);
      setSelectedStudent(null);
    } finally {
      setLoadingRegs(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = `${s.registrationNo || ''} ${s.name || ''} ${s.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, search]);

  const onSelectStudent = async (s) => {
    setError('');
    setSuccess('');
    setSelectedSemester('');
    setEditingStudentSemester('');
    await loadStudentRegs(s._id);
  };
  const semesterOptions = useMemo(() => {
    const sems = registrations
      .map((r) => Number(r.course?.semester))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    return [...new Set(sems)];
  }, [registrations]);

  const displayedRegistrations = useMemo(() => {
    const rows = registrations.slice().sort((a, b) => {
      const sa = a.course?.semester ?? 0;
      const sb = b.course?.semester ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.course?.courseCode || '').localeCompare(b.course?.courseCode || '');
    });
    if (!selectedSemester) return rows;
    const semNum = Number(selectedSemester);
    return rows.filter((r) => Number(r.course?.semester) === semNum);
  }, [registrations, selectedSemester]);

  const overallCgpa = useMemo(
    () => calcCgpa(registrations.filter((r) => r.status === 'completed' && r.gradePoint !== null && r.gradePoint !== undefined)),
    [registrations]
  );

  const shownCgpa = useMemo(
    () => calcCgpa(displayedRegistrations.filter((r) => r.status === 'completed' && r.gradePoint !== null && r.gradePoint !== undefined)),
    [displayedRegistrations]
  );


  const updateMarksLocal = (registrationId, value) => {
    setRegistrations((prev) =>
      prev.map((r) => (r._id === registrationId ? { ...r, marks: value } : r))
    );
  };

  const saveMarks = async (reg) => {
    try {
      setError('');
      setSuccess('');
      setSaving((p) => ({ ...p, [reg._id]: true }));
      const marksNum = reg.marks === '' || reg.marks === null || reg.marks === undefined ? null : Number(reg.marks);
      const res = await api.put(`/results/admin/registrations/${reg._id}/marks`, { marks: marksNum });
      if (res.data.success) {
        const adv = res.data.semesterAdvance;
        let msg = 'Marks saved.';
        if (adv?.changed) {
          msg += adv.manual
            ? ` Student semester set to ${adv.after}.`
            : ` Student advanced: Semester ${adv.before} → ${adv.after}.`;
        }
        setSuccess(msg);
        if (selectedStudent?._id) {
          await loadStudentRegs(selectedStudent._id);
          await loadStudents();
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving((p) => ({ ...p, [reg._id]: false }));
    }
  };

  const saveStudentSemester = async () => {
    if (!selectedStudent?._id) return;
    const sem = Number(editingStudentSemester);
    if (!Number.isFinite(sem) || sem < 1 || sem > MAX_SEMESTER) {
      setError(`Semester must be between 1 and ${MAX_SEMESTER}`);
      return;
    }
    try {
      setError('');
      setSuccess('');
      setSemesterSaveLoading(true);
      const res = await api.patch(`/results/admin/students/${selectedStudent._id}/semester`, {
        semester: sem
      });
      if (res.data.success) {
        setSuccess(`Student semester updated to ${sem}.`);
        await loadStudents();
        await loadStudentRegs(selectedStudent._id);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update semester');
    } finally {
      setSemesterSaveLoading(false);
    }
  };

  const recalculateSemesters = async () => {
    try {
      setError('');
      setSuccess('');
      setRecalcLoading(true);
      const res = await api.post('/results/admin/recalculate-semesters');
      setSuccess(res.data?.message || 'Semester progression recalculated.');
      await loadStudents();
      if (selectedStudent?._id) {
        await loadStudentRegs(selectedStudent._id);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to recalculate semesters');
    } finally {
      setRecalcLoading(false);
    }
  };

  if (loadingStudents) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Marks Entry</h1>
        <button className="btn btn-secondary" onClick={recalculateSemesters} disabled={recalcLoading}>
          {recalcLoading ? 'Recalculating…' : 'Recalculate Semesters'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Students</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadStudents}>Refresh</button>
          </div>
          <div className="form-group" style={{ marginTop: '10px' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reg no, name, email"
            />
          </div>
          <div style={{ maxHeight: '60vh', overflow: 'auto', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
            {filteredStudents.length === 0 ? (
              <p className="no-data">No students found.</p>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onSelectStudent(s)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: '8px',
                    background: selectedStudent?._id === s._id ? '#eef2ff' : undefined,
                    borderColor: selectedStudent?._id === s._id ? '#4f46e5' : undefined
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.registrationNo} — {s.name}</div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{s.program} • Sem {s.semester}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '14px' }}>
          {!selectedStudent ? (
            <p className="no-data">Select a student to view registered courses and enter marks.</p>
          ) : loadingRegs ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedStudent.name}</h2>
                  <div style={{ opacity: 0.9, marginTop: '4px' }}>
                    <strong>{selectedStudent.registrationNo}</strong> • {selectedStudent.program} • Current Semester <strong>{selectedStudent.semester}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <span>Current semester</span>
                    <select
                      value={editingStudentSemester}
                      onChange={(e) => setEditingStudentSemester(e.target.value)}
                      className="btn btn-secondary btn-sm"
                    >
                      {SEMESTER_OPTIONS.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={saveStudentSemester}
                      disabled={semesterSaveLoading}
                    >
                      {semesterSaveLoading ? 'Saving…' : 'Update'}
                    </button>
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="btn btn-secondary btn-sm"
                  >
                    <option value="">All Semesters</option>
                    {semesterOptions.map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadStudentRegs(selectedStudent._id)}>Refresh</button>
                </div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {SEMESTER_OPTIONS.map((sem) => {
                  const active = Number(selectedSemester) === sem;
                  return (
                    <button
                      key={sem}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedSemester(active ? '' : String(sem))}
                      style={{
                        borderColor: active ? '#16a34a' : undefined,
                        background: active ? '#dcfce7' : undefined,
                        color: active ? '#166534' : undefined
                      }}
                    >
                      {active ? '✓ ' : ''}Sem {sem}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <strong>Shown CGPA:</strong> {shownCgpa}
                </div>
                <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #4f46e5', borderRadius: '8px', background: '#eef2ff' }}>
                  <strong>Overall CGPA:</strong> {overallCgpa}
                </div>
                <div className="stat-card" style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                  <strong>Grade Scale:</strong> A, A-, B+, B, B-, C+, C, D, F
                </div>
              </div>

              {registrations.length === 0 ? (
                <p className="no-data" style={{ marginTop: '14px' }}>No registrations found for this student.</p>
              ) : (
                <div className="table-container" style={{ marginTop: '14px' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Semester</th>
                        <th>Attempt</th>
                        <th>Status</th>
                        <th>Attendance</th>
                        <th style={{ width: 160 }}>Marks (0-100)</th>
                        <th>Grade</th>
                        <th>Grade Point</th>
                        <th>Quality Points</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRegistrations.map((r) => {
                          const disabled = r.status === 'dropped';
                          return (
                            <tr key={r._id} style={{ opacity: disabled ? 0.6 : 1 }}>
                              <td>
                                <strong>{r.course?.courseCode}</strong> — {r.course?.courseName}
                              </td>
                              <td>{r.course?.semester}</td>
                              <td>{r.attempt}</td>
                              <td>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: r.status === 'completed' ? '#dcfce7' : r.status === 'registered' ? '#e0f2fe' : '#fee2e2',
                                  border: '1px solid #e5e7eb',
                                  fontWeight: 600,
                                  fontSize: '0.78rem'
                                }}>
                                  {r.status}
                                </span>
                              </td>
                              <td>
                                {(r.attendanceSummary?.presentCount || 0)}/
                                {(r.attendanceSummary?.totalSessions || 0)} (
                                {r.attendanceSummary?.percentage || 0}%)
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  disabled={disabled}
                                  value={r.marks ?? ''}
                                  onChange={(e) => updateMarksLocal(r._id, e.target.value)}
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
                              </td>
                              <td>
                                {r.grade ? (
                                  <span><strong>{r.grade}</strong></span>
                                ) : (
                                  <span style={{ opacity: 0.7 }}>—</span>
                                )}
                              </td>
                              <td>{r.gradePoint ?? '—'}</td>
                              <td>
                                {r.gradePoint !== null && r.gradePoint !== undefined
                                  ? ((Number(r.gradePoint) || 0) * (Number(r.course?.credits) || 0)).toFixed(2)
                                  : '—'}
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  disabled={disabled || saving[r._id]}
                                  onClick={() => saveMarks(r)}
                                >
                                  {saving[r._id] ? 'Saving…' : 'Save'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarksEntry;

