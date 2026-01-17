import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const CourseAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    courseId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load allocations and courses
      const [allocationsRes, coursesRes] = await Promise.all([
        api.get('/allocations').catch(err => {
          console.error('Failed to load allocations:', err);
          return { data: { allocations: [] } };
        }),
        api.get('/courses').catch(err => {
          console.error('Failed to load courses:', err);
          return { data: { courses: [] } };
        })
      ]);
      
      setAllocations(allocationsRes.data.allocations || []);
      setCourses(coursesRes.data.courses || []);
      
      // Try to load teachers (optional - form can work without it)
      try {
        const teachersRes = await api.get('/users?role=teacher');
        setTeachers(teachersRes.data.users || []);
      } catch (teacherError) {
        // Teachers endpoint might not exist - that's okay, form has fallback input
        console.warn('Could not load teachers list:', teacherError);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await api.post('/allocations', formData);
      setSuccess('Course allocated successfully');
      setShowForm(false);
      setFormData({ teacherId: '', courseId: '' });
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
        <div className="card">
          <h2>Allocate Course to Teacher</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Teacher</label>
              {teachers.length > 0 ? (
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  required
                >
                  <option value="">Select a teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} ({teacher.registrationNo})
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Teacher ID (e.g., T001)"
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    required
                  />
                  <small>Enter teacher registration number or ID</small>
                </>
              )}
            </div>
            <div className="form-group">
              <label>Course</label>
              <select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                required
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseCode} - {course.courseName}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Allocate</button>
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

