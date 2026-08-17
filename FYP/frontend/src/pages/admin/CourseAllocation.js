import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const CourseAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [collapsedSemesters, setCollapsedSemesters] = useState(() => new Set());
  const [formData, setFormData] = useState({
    teacherId: '',
    courseIds: []
  });

  const getSemesterNumber = (course) => {
    const raw = course?.semester;
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };

  const getCoursesGroupedBySemester = () => {
    const groups = new Map();
    courses.forEach((course) => {
      const sem = getSemesterNumber(course) ?? 0;
      if (!groups.has(sem)) groups.set(sem, []);
      groups.get(sem).push(course);
    });

    // Sort within semester for stable UX
    for (const [sem, list] of groups.entries()) {
      list.sort((a, b) => {
        const aCode = (a?.courseCode || '').toString();
        const bCode = (b?.courseCode || '').toString();
        return aCode.localeCompare(bCode);
      });
      groups.set(sem, list);
    }

    // Semesters ascending, unknown/invalid at end (sem=0)
    return Array.from(groups.entries()).sort(([aSem], [bSem]) => {
      if (aSem === 0 && bSem !== 0) return 1;
      if (bSem === 0 && aSem !== 0) return -1;
      return aSem - bSem;
    });
  };

  const normalize = (value) => (value || '').toString().toLowerCase().trim();

  const filteredTeachers = teachers.filter((t) => {
    const q = normalize(teacherSearch);
    if (!q) return true;
    return (
      normalize(t?.name).includes(q) ||
      normalize(t?.email).includes(q) ||
      normalize(t?.registrationNo).includes(q) ||
      normalize(t?._id).includes(q)
    );
  });

  const getFilteredSemesterCourses = (semesterCourses) => {
    const q = normalize(courseSearch);
    if (!q) return semesterCourses;
    return semesterCourses.filter((c) => {
      return (
        normalize(c?.courseCode).includes(q) ||
        normalize(c?.courseName).includes(q) ||
        normalize(c?.courseId).includes(q) ||
        normalize(c?.program).includes(q)
      );
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

  const clearSelectedCourses = () => setFormData((prev) => ({ ...prev, courseIds: [] }));

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load allocations, courses, and programs
      const [allocationsRes, coursesRes, programsRes] = await Promise.all([
        api.get('/allocations').catch(err => {
          console.error('Failed to load allocations:', err);
          return { data: { allocations: [] } };
        }),
        api.get('/courses', {
          params: selectedProgram && selectedProgram !== 'All' ? { program: selectedProgram } : undefined
        }).catch(err => {
          console.error('Failed to load courses:', err);
          return { data: { courses: [] } };
        }),
        api.get('/courses/programs').catch(() => ({ data: { programs: [] } }))
      ]);
      
      setAllocations(allocationsRes.data.allocations || []);
      const loadedCourses = coursesRes.data.courses || [];
      setCourses(loadedCourses);
      setPrograms(programsRes.data.programs || []);

      // Drop any selected courses that are already allocated (one course => one teacher)
      const allocatedCourseIds = new Set(
        loadedCourses
          .filter((c) => c?.teacherId?._id)
          .map((c) => c._id)
      );
      setFormData((prev) => {
        const current = Array.isArray(prev.courseIds) ? prev.courseIds : [];
        const next = current.filter((id) => !allocatedCourseIds.has(id));
        return next.length === current.length ? prev : { ...prev, courseIds: next };
      });
      
      // Load teachers
      try {
        const teachersRes = await api.get('/users?role=teacher');
        console.log('Teachers loaded:', teachersRes.data);
        if (teachersRes.data.success) {
          setTeachers(teachersRes.data.users || []);
        } else {
          console.warn('Failed to load teachers:', teachersRes.data.message);
          setTeachers([]);
        }
      } catch (teacherError) {
        console.error('Error loading teachers:', teacherError);
        setError(`Failed to load teachers: ${teacherError.response?.data?.message || teacherError.message}`);
        setTeachers([]);
      }
      
      // Show error only if both allocations and courses failed
      if (!allocationsRes.data.allocations && !coursesRes.data.courses) {
        setError('Failed to load data');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedProgram]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      // Validate that a teacher is selected
      if (!formData.teacherId) {
        setError('Please select a teacher');
        return;
      }
      
      if (!Array.isArray(formData.courseIds) || formData.courseIds.length === 0) {
        setError('Please select at least one course');
        return;
      }
      
      await api.post('/allocations', {
        teacherId: formData.teacherId,
        courseIds: formData.courseIds
      });
      setSuccess('Course(s) allocated successfully');
      setShowForm(false);
      setFormData({ teacherId: '', courseIds: [] });
      loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to allocate course');
    }
  };

  const handleDeallocate = async (allocationId) => {
    if (!window.confirm('Are you sure you want to deallocate this course?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/allocations/${allocationId}`);
      setSuccess('Course deallocated successfully');
      loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to deallocate course');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Course Allocation</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Allocate Course'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card allocation-card">
          <form onSubmit={handleSubmit}>
            <div className="allocation-card-header">
              <h2>Allocate Course to Teacher</h2>
              <button type="submit" className="btn btn-primary">
                Allocate
              </button>
            </div>
            <div className="allocation-form-grid">
              <div className="allocation-panel">
                <div className="allocation-panel-header">
                  <div>
                    <div className="allocation-panel-title">Teacher</div>
                    <div className="allocation-panel-subtitle">Select exactly one</div>
                  </div>
                  <input
                    className="allocation-search"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search teacher (name, email, reg#)"
                    aria-label="Search teacher"
                  />
                </div>

                {teachers.length > 0 ? (
                  <div className="allocation-list">
                    {filteredTeachers.map((teacher) => (
                      <label
                        key={teacher._id}
                        className="allocation-row"
                      >
                        <input
                          type="checkbox"
                          checked={formData.teacherId === teacher._id}
                          onChange={(e) => {
                            if (e.target.checked) setFormData({ ...formData, teacherId: teacher._id });
                            else setFormData({ ...formData, teacherId: '' });
                          }}
                        />
                        <div className="allocation-row-main">
                          <div className="allocation-row-title">{teacher.name}</div>
                          <div className="allocation-row-meta">
                            {teacher.email ? teacher.email : null}
                            {teacher.registrationNo ? ` • ${teacher.registrationNo}` : null}
                          </div>
                        </div>
                      </label>
                    ))}

                    {filteredTeachers.length === 0 && (
                      <div className="allocation-empty">No teachers match your search.</div>
                    )}
                  </div>
                ) : (
                  <div className="allocation-empty">
                    No teachers found. Please add teachers first through User Management.
                  </div>
                )}
              </div>

              <div className="allocation-panel">
                <div className="allocation-panel-header">
                  <div>
                    <div className="allocation-panel-title">Courses</div>
                    <div className="allocation-panel-subtitle">
                      Select one or more (semester-wise)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={selectedProgram}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSelectedProgram(next);
                        setCourseSearch('');
                        setCollapsedSemesters(new Set());
                        clearSelectedCourses();
                        // reload data using new program filter
                        setTimeout(loadData, 0);
                      }}
                      className="allocation-program-filter-select"
                      aria-label="Filter courses by program"
                    >
                      <option value="All">All Programs</option>
                      {programs.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      className="allocation-search"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Search courses (code, name)"
                      aria-label="Search courses"
                    />
                  </div>
                </div>

                {courses.length > 0 ? (
                  <div className="allocation-list allocation-courses">
                    {getCoursesGroupedBySemester().map(([semester, semesterCourses]) => {
                      const filtered = getFilteredSemesterCourses(semesterCourses);
                      if (filtered.length === 0) return null;

                      const isCollapsed = collapsedSemesters.has(semester);
                      const selectedInSemester = filtered.filter((c) =>
                        Array.isArray(formData.courseIds) && formData.courseIds.includes(c._id)
                      ).length;

                      return (
                        <div key={`sem-${semester}`} className="allocation-semester">
                          <button
                            type="button"
                            className="allocation-semester-header"
                            onClick={() => toggleSemesterCollapsed(semester)}
                          >
                            <div className="allocation-semester-title">
                              {semester === 0 ? 'Other / Unknown Semester' : `Semester ${semester}`}
                            </div>
                            <div className="allocation-semester-meta">
                              {selectedInSemester > 0 ? `${selectedInSemester} selected • ` : ''}
                              {filtered.length} course(s)
                              <span className="allocation-semester-caret">{isCollapsed ? '▸' : '▾'}</span>
                            </div>
                          </button>

                          {!isCollapsed && (
                            <div className="allocation-semester-body">
                              {filtered.map((course) => {
                                const allocatedTeacherName =
                                  course?.teacherId?.name ||
                                  course?.teacherId?.email ||
                                  course?.teacherId?._id ||
                                  '';
                                const isAllocatedToAnyTeacher = Boolean(course?.teacherId?._id);

                                return (
                                  <label
                                    key={course._id}
                                    className={`allocation-row ${isAllocatedToAnyTeacher ? 'disabled' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isAllocatedToAnyTeacher}
                                      checked={Array.isArray(formData.courseIds) && formData.courseIds.includes(course._id)}
                                      onChange={(e) => {
                                        const current = Array.isArray(formData.courseIds) ? formData.courseIds : [];
                                        if (e.target.checked) {
                                          if (!current.includes(course._id)) {
                                            setFormData({ ...formData, courseIds: [...current, course._id] });
                                          }
                                        } else {
                                          setFormData({ ...formData, courseIds: current.filter((id) => id !== course._id) });
                                        }
                                      }}
                                    />
                                    <div className="allocation-row-main">
                                      <div className="allocation-row-title">
                                        {(course.courseCode || '').toString()} — {(course.courseName || '').toString()}
                                      </div>
                                      <div className="allocation-row-meta">
                                        {course.program ? `Program: ${course.program}` : null}
                                        {isAllocatedToAnyTeacher ? ` • Allocated to: ${allocatedTeacherName}` : null}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="allocation-empty">
                    No courses found. Please add courses first through Course Management.
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Teacher</th>
            <th>Course</th>
            <th>Course Code</th>
            <th>Allocation Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map(allocation => (
            <tr key={allocation._id}>
              <td>{allocation.teacherId?.name || 'N/A'}</td>
              <td>{allocation.courseId?.courseName || 'N/A'}</td>
              <td>{allocation.courseId?.courseCode || 'N/A'}</td>
              <td>{new Date(allocation.allocationDate).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge ${allocation.status}`}>
                  {allocation.status}
                </span>
              </td>
              <td>
                {allocation.status === 'allocated' && (
                  <button
                    onClick={() => handleDeallocate(allocation._id)}
                    className="btn btn-danger btn-sm"
                  >
                    Deallocate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {allocations.length === 0 && (
        <p className="no-data">No allocations found.</p>
      )}
    </div>
  );
};

export default CourseAllocation;

