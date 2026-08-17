import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [collapsedSemesters, setCollapsedSemesters] = useState(() => new Set());
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    credits: '',
    semester: '',
    program: '',
    degreeLevels: [],
    maxStudents: '',
    description: '',
    prerequisites: [],
    registrationStartDate: '',
    registrationEndDate: ''
  });

  const prerequisiteCandidates = useMemo(() => {
    const sem = Number.parseInt(formData.semester, 10);
    const program = (formData.program || '').toString().trim().toLowerCase();
    return (courses || [])
      .filter((c) => c?._id)
      .filter((c) => {
        if (!program) return true;
        return (c.program || '').toString().trim().toLowerCase() === program;
      })
      .filter((c) => {
        const cSem = typeof c.semester === 'number' ? c.semester : Number.parseInt(c.semester, 10);
        if (!Number.isFinite(sem)) return true;
        return Number.isFinite(cSem) ? cSem < sem : true;
      })
      .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));
  }, [courses, formData.program, formData.semester]);

  const prerequisiteIdSet = useMemo(() => {
    const ids = Array.isArray(formData.prerequisites) ? formData.prerequisites : [];
    return new Set(ids.map((x) => (x?._id ? x._id.toString() : x?.toString())));
  }, [formData.prerequisites]);

  const loadPrograms = useCallback(async () => {
    try {
      const res = await api.get('/courses/programs');
      setPrograms(res.data.programs || []);
    } catch (e) {
      // Non-blocking: program filter can still work as "All"
      setPrograms([]);
    }
  }, []);

  const getSemesterNumber = (course) => {
    const raw = course?.semester;
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getCoursesGroupedBySemester = () => {
    const groups = new Map();
    courses.forEach((course) => {
      const sem = getSemesterNumber(course);
      if (!groups.has(sem)) groups.set(sem, []);
      groups.get(sem).push(course);
    });

    for (const [sem, list] of groups.entries()) {
      list.sort((a, b) => (a?.courseCode || '').toString().localeCompare((b?.courseCode || '').toString()));
      groups.set(sem, list);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 0 && b !== 0) return 1;
      if (b === 0 && a !== 0) return -1;
      return a - b;
    });
  };

  const toggleSemesterCollapsed = (semester) => {
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(semester)) next.delete(semester);
      else next.add(semester);
      return next;
    });
  };

  const loadCourses = useCallback(async (program = selectedProgram) => {
    try {
      setLoading(true);
      const params = {};
      if (program && program !== 'All') params.program = program;
      const response = await api.get('/courses', { params });
      setCourses(response.data.courses || []);
    } catch (error) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [selectedProgram]);

  useEffect(() => {
    loadPrograms();
    loadCourses('All');
  }, [loadPrograms, loadCourses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const toInt = (v) => {
        if (v === null || v === undefined || v === '') return NaN;
        const n = typeof v === 'number' ? v : Number.parseInt(v, 10);
        return Number.isFinite(n) ? n : NaN;
      };
      const courseData = {
        ...formData,
        program: (formData.program || '').toString().trim(),
        credits: toInt(formData.credits),
        semester: toInt(formData.semester),
        maxStudents: toInt(formData.maxStudents),
        degreeLevels: Array.isArray(formData.degreeLevels) 
          ? formData.degreeLevels 
          : formData.degreeLevels.split(',').map(d => d.trim()).filter(d => d),
        prerequisites: Array.isArray(formData.prerequisites) 
          ? formData.prerequisites 
          : [],
        registrationStartDate: formData.registrationStartDate ? new Date(formData.registrationStartDate).toISOString() : null,
        registrationEndDate: formData.registrationEndDate ? new Date(formData.registrationEndDate).toISOString() : null
      };

      if (!Number.isFinite(courseData.credits) || courseData.credits <= 0) {
        setError('Credits must be a valid number.');
        return;
      }
      if (!Number.isFinite(courseData.semester) || courseData.semester <= 0) {
        setError('Semester must be a valid number.');
        return;
      }
      if (!Number.isFinite(courseData.maxStudents) || courseData.maxStudents <= 0) {
        setError('Max Students must be a valid number.');
        return;
      }

      if (editingCourse) {
        const res = await api.put(`/courses/${editingCourse._id}`, courseData);
        const updated = res.data?.course;
        if (updated?._id) {
          setCourses((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
        }
        setSuccess(`Course updated successfully (Max Students: ${updated?.maxStudents ?? courseData.maxStudents})`);
      } else {
        const res = await api.post('/courses', courseData);
        const created = res.data?.course;
        if (created?._id) {
          setCourses((prev) => [created, ...prev]);
        }
        setSuccess(`Course added successfully (Max Students: ${created?.maxStudents ?? courseData.maxStudents})`);
      }
      
      setShowForm(false);
      setEditingCourse(null);
      setFormData({
        courseCode: '',
        courseName: '',
        credits: '',
        semester: '',
        program: '',
        degreeLevels: [],
        maxStudents: '',
        description: '',
        prerequisites: [],
        registrationStartDate: '',
        registrationEndDate: ''
      });
      loadPrograms();
      loadCourses(selectedProgram);
    } catch (error) {
      setError(error.response?.data?.message || (editingCourse ? 'Failed to update course' : 'Failed to add course'));
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    
    // Format dates for input fields (YYYY-MM-DDTHH:mm format)
    const formatDateForInput = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setFormData({
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      credits: course.credits || '',
      semester: course.semester || '',
      program: course.program || '',
      degreeLevels: course.degreeLevels || [],
      maxStudents: course.maxStudents || '',
      description: course.description || '',
      prerequisites: Array.isArray(course.prerequisites)
        ? course.prerequisites.map((p) => (p?._id ? p._id : p)).filter(Boolean)
        : [],
      registrationStartDate: formatDateForInput(course.registrationStartDate),
      registrationEndDate: formatDateForInput(course.registrationEndDate)
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/courses/${id}`);
      setSuccess('Course deleted successfully');
      loadCourses();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCourse(null);
    setFormData({
      courseCode: '',
      courseName: '',
      credits: '',
      semester: '',
      program: '',
      degreeLevels: [],
      maxStudents: '',
      description: '',
      prerequisites: [],
      registrationStartDate: '',
      registrationEndDate: ''
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container course-management-page">
      <div className="page-header">
        <h1>Course Management</h1>
        <div>
          <select
            className="program-filter-select"
            value={selectedProgram}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedProgram(next);
              loadCourses(next);
            }}
            aria-label="Filter by program"
          >
            <option value="All">All Programs</option>
            {programs.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            Add Course
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="gen-modal-overlay" onClick={handleCancel}>
          <div className="gen-modal" style={{ width: 'min(720px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
              <button type="button" className="gen-modal__close" onClick={handleCancel}>✕</button>
            </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Course Code</label>
              <input
                type="text"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., CS101"
              />
            </div>
            <div className="form-group">
              <label>Course Name</label>
              <input
                type="text"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                required
                placeholder="e.g., Introduction to Computer Science"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Credits</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  step="1"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Students</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Program</label>
              <input
                type="text"
                list="program-options"
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                required
                placeholder="Type program (or pick from suggestions)"
              />
              <datalist id="program-options">
                {programs.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Degree Levels (comma-separated: BS, Master, MPhil)</label>
              <input
                type="text"
                value={Array.isArray(formData.degreeLevels) ? formData.degreeLevels.join(', ') : formData.degreeLevels}
                onChange={(e) => setFormData({ ...formData, degreeLevels: e.target.value })}
                required
                placeholder="e.g., BS, Master, MPhil"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Course description (optional)"
              />
            </div>

            <div className="form-group">
              <label>Prerequisites</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const current = Array.isArray(formData.prerequisites) ? formData.prerequisites : [];
                    if (prerequisiteIdSet.has(id.toString())) return;
                    setFormData({ ...formData, prerequisites: [...current, id] });
                  }}
                >
                  <option value="">Select a prerequisite course…</option>
                  {prerequisiteCandidates.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode} — {c.courseName} (Sem {c.semester})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFormData({ ...formData, prerequisites: [] })}
                  disabled={!Array.isArray(formData.prerequisites) || formData.prerequisites.length === 0}
                >
                  Clear
                </button>
              </div>

              {Array.isArray(formData.prerequisites) && formData.prerequisites.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {formData.prerequisites.map((pid) => {
                    const id = pid?._id ? pid._id.toString() : pid.toString();
                    const course = courses.find((c) => c._id?.toString() === id);
                    const label = course ? `${course.courseCode} — ${course.courseName}` : id;
                    return (
                      <span
                        key={id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '999px',
                          border: '1px solid #e5e7eb',
                          background: '#f8fafc',
                          fontSize: '0.85rem'
                        }}
                      >
                        <strong>{label}</strong>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 8px' }}
                          onClick={() => {
                            const next = formData.prerequisites.filter((x) => (x?._id ? x._id.toString() : x.toString()) !== id);
                            setFormData({ ...formData, prerequisites: next });
                          }}
                        >
                          Remove
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <small style={{ color: '#666', fontSize: '12px' }}>
                Recommended: choose prerequisite courses from earlier semesters of the same program.
              </small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Registration Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.registrationStartDate}
                  onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                  placeholder="Optional"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>When students can start registering (optional)</small>
              </div>
              <div className="form-group">
                <label>Registration End Date & Time (Deadline)</label>
                <input
                  type="datetime-local"
                  value={formData.registrationEndDate}
                  onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                  placeholder="Optional"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>Last date/time students can register (optional)</small>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingCourse ? 'Update Course' : 'Add Course'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Semester</th>
              <th>Program</th>
              <th>Max Students</th>
              <th>Actions</th>
            </tr>
          </thead>
          {getCoursesGroupedBySemester().map(([semester, semesterCourses]) => {
            const isCollapsed = collapsedSemesters.has(semester);
            return (
              <tbody key={`sem-${semester}`}>
                <tr className="semester-section-row">
                  <td colSpan={7}>
                    <button
                      type="button"
                      className="semester-section-toggle"
                      onClick={() => toggleSemesterCollapsed(semester)}
                    >
                      <span className="semester-section-title">
                        {semester === 0 ? 'Other / Unknown Semester' : `Semester ${semester}`}
                      </span>
                      <span className="semester-section-meta">
                        {semesterCourses.length} course(s) <span className="semester-section-caret">{isCollapsed ? '▸' : '▾'}</span>
                      </span>
                    </button>
                  </td>
                </tr>

                {!isCollapsed &&
                  semesterCourses.map((course) => (
                    <tr key={course._id}>
                      <td><strong>{course.courseCode}</strong></td>
                      <td>{course.courseName}</td>
                      <td>{course.credits}</td>
                      <td>{course.semester}</td>
                      <td>{course.program}</td>
                      <td>{course.maxStudents}</td>
                      <td>
                        <button
                          onClick={() => handleEdit(course)}
                          className="btn btn-secondary btn-sm"
                          style={{ marginRight: '5px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course._id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>

      {courses.length === 0 && (
        <p className="no-data">No courses found. Add a course to get started.</p>
      )}
    </div>
  );
};

export default CourseManagement;
