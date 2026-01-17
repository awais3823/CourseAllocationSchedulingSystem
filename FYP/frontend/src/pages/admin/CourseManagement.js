import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseId: '',
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

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const courseData = {
        ...formData,
        credits: parseInt(formData.credits),
        semester: parseInt(formData.semester),
        maxStudents: parseInt(formData.maxStudents),
        degreeLevels: Array.isArray(formData.degreeLevels) 
          ? formData.degreeLevels 
          : formData.degreeLevels.split(',').map(d => d.trim()).filter(d => d),
        prerequisites: Array.isArray(formData.prerequisites) 
          ? formData.prerequisites 
          : [],
        registrationStartDate: formData.registrationStartDate ? new Date(formData.registrationStartDate).toISOString() : null,
        registrationEndDate: formData.registrationEndDate ? new Date(formData.registrationEndDate).toISOString() : null
      };

      if (editingCourse) {
        await api.put(`/courses/${editingCourse._id}`, courseData);
        setSuccess('Course updated successfully');
      } else {
        await api.post('/courses', courseData);
        setSuccess('Course added successfully');
      }
      
      setShowForm(false);
      setEditingCourse(null);
      setFormData({
        courseId: '',
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
      loadCourses();
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
      courseId: course.courseId || '',
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      credits: course.credits || '',
      semester: course.semester || '',
      program: course.program || '',
      degreeLevels: course.degreeLevels || [],
      maxStudents: course.maxStudents || '',
      description: course.description || '',
      prerequisites: course.prerequisites || [],
      registrationStartDate: formatDateForInput(course.registrationStartDate),
      registrationEndDate: formatDateForInput(course.registrationEndDate)
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      courseId: '',
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
    <div className="page-container">
      <div className="page-header">
        <h1>Course Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Course'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <h2>{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Course ID</label>
              <input
                type="text"
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value.toUpperCase() })}
                required
                placeholder="e.g., CS101"
                disabled={!!editingCourse}
              />
            </div>
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
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Students</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Program</label>
              <input
                type="text"
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                required
                placeholder="e.g., Computer Science"
              />
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
              {editingCourse && (
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
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
          <tbody>
            {courses.map(course => (
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
        </table>
      </div>

      {courses.length === 0 && (
        <p className="no-data">No courses found. Add a course to get started.</p>
      )}
    </div>
  );
};

export default CourseManagement;
