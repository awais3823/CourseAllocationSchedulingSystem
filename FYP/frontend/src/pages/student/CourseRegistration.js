import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './StudentPages.css';

const CourseRegistration = () => {
  const [courses, setCourses] = useState([]);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRegisteredCourses();
    loadCourses();
  }, []);

  const loadRegisteredCourses = async () => {
    try {
      const response = await api.get('/registrations');
      if (response.data.success) {
        const courseIds = (response.data.registrations || [])
          .filter(reg => reg.status === 'registered')
          .map(reg => reg.courseId?._id || reg.courseId);
        setRegisteredCourseIds(courseIds);
      }
    } catch (error) {
      console.error('Failed to load registered courses:', error);
    }
  };

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

  const handleRegister = async (courseId, courseName) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post('/registrations', { courseId });
      
      if (response.data.success) {
        setSuccess(`Successfully registered for ${courseName}`);
        loadRegisteredCourses();
        loadCourses();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register for course');
    }
  };

  // Check if course is already registered
  const isAlreadyRegistered = (courseId) => {
    if (!courseId) return false;
    return registeredCourseIds.some(id => 
      id?.toString() === courseId?.toString()
    );
  };

  // Check if registration deadline has passed
  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  };

  // Check if registration has started
  const isRegistrationStarted = (startDate) => {
    if (!startDate) return true; // If no start date, registration is open
    const startDateObj = new Date(startDate);
    const now = new Date();
    return now >= startDateObj;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group courses by semester
  const groupCoursesBySemester = () => {
    const grouped = {};
    courses.forEach(course => {
      const semester = course.semester || 0;
      if (!grouped[semester]) {
        grouped[semester] = [];
      }
      grouped[semester].push(course);
    });
    
    // Sort semesters and courses within each semester
    const sortedSemesters = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));
    const result = {};
    sortedSemesters.forEach(sem => {
      result[sem] = grouped[sem].sort((a, b) => {
        // Sort by course code within semester
        return (a.courseCode || '').localeCompare(b.courseCode || '');
      });
    });
    return result;
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const coursesBySemester = groupCoursesBySemester();
  const semesters = Object.keys(coursesBySemester).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="page-container">
      <h1>Course Registration</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {courses.length === 0 ? (
        <p>No courses available for registration.</p>
      ) : (
        <div>
          {semesters.map((semester) => (
            <div key={semester} style={{ marginBottom: '30px' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#4f46e5',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                Semester {semester}
              </h2>
              <div className="courses-list">
                {coursesBySemester[semester].map((course) => {
                  const alreadyRegistered = isAlreadyRegistered(course._id);
                  const deadlinePassed = isDeadlinePassed(course.registrationEndDate);
                  const registrationNotStarted = !isRegistrationStarted(course.registrationStartDate);
                  const canRegister = !deadlinePassed && !registrationNotStarted && !alreadyRegistered;
                  
                  return (
                    <div key={course._id} className="course-card">
                      <h3>{course.courseCode} - {course.courseName}</h3>
                      <p><strong>Credits:</strong> {course.credits}</p>
                      <p><strong>Max Students:</strong> {course.maxStudents}</p>
                      <p><strong>Teacher:</strong> {course.teacherId?.name || 'TBA'}</p>
                      
                      {course.registrationStartDate && (
                        <p><strong>Registration Starts:</strong> {formatDate(course.registrationStartDate)}</p>
                      )}
                      
                      {course.registrationEndDate && (
                        <p style={{ 
                          color: deadlinePassed ? '#dc3545' : '#333',
                          fontWeight: deadlinePassed ? '600' : 'normal'
                        }}>
                          <strong>Registration Deadline:</strong> {formatDate(course.registrationEndDate)}
                        </p>
                      )}
                      
                      {alreadyRegistered ? (
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: '#d1ecf1', 
                          border: '1px solid #0c5460',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#0c5460',
                          fontWeight: '600'
                        }}>
                          Already Registered
                        </div>
                      ) : registrationNotStarted ? (
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: '#fff3cd', 
                          border: '1px solid #ffc107',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#856404',
                          fontWeight: '500'
                        }}>
                          Registration Not Started Yet
                        </div>
                      ) : deadlinePassed ? (
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: '#f8d7da', 
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#721c24',
                          fontWeight: '500'
                        }}>
                          Deadline Passed
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegister(course._id, course.courseName)}
                          className="btn btn-primary"
                        >
                          Register
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseRegistration;
