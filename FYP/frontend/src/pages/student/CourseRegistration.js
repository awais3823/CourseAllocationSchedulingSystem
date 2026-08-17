import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { MAX_SEMESTER } from '../../constants';
import './StudentPages.css';

const CourseRegistration = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [registeredCourseIds, setRegisteredCourseIds] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [waitlistedCourseIds, setWaitlistedCourseIds] = useState([]);
  const [overloadRequests, setOverloadRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRegisteredCourses();
    loadWaitlist();
    loadOverloadRequests();
    loadCourses();
  }, []);

  const loadRegisteredCourses = async () => {
    try {
      const response = await api.get('/registrations');
      if (response.data.success) {
        const regs = response.data.registrations || [];
        const activeRegs = regs.filter(reg => reg.status === 'registered');
        const courseIds = activeRegs.map(reg => reg.courseId?._id || reg.courseId);
        setAllRegistrations(regs);
        setRegisteredCourseIds(courseIds);
        setRegisteredCourses(activeRegs);
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

  const loadOverloadRequests = async () => {
    try {
      const response = await api.get('/overload-requests/my');
      if (response.data.success) {
        setOverloadRequests(response.data.requests || []);
      }
    } catch (error) {
      // Silent failure: registration can still work without this
      console.error('Failed to load overload requests:', error);
    }
  };

  const loadWaitlist = async () => {
    try {
      const response = await api.get('/registrations/waitlist');
      if (response.data.success) {
        const ids = (response.data.waitlist || [])
          .map((w) => w.courseId?._id || w.courseId)
          .filter(Boolean)
          .map((id) => id.toString());
        setWaitlistedCourseIds(Array.from(new Set(ids)));
      } else {
        setWaitlistedCourseIds([]);
      }
    } catch (error) {
      // Non-fatal: registration page can still function if waitlist fetch fails
      setWaitlistedCourseIds([]);
      console.error('Failed to load waitlist:', error);
    }
  };

  const handleRegister = async (courseId, courseName) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post('/registrations', { courseId });
      
      if (response.data.success) {
        setSuccess(response.data.message || `Successfully registered for ${courseName}`);
        loadRegisteredCourses();
        loadWaitlist();
        loadOverloadRequests();
        loadCourses();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register for course');
    }
  };

  const handleRequestOverload = async (courseId, courseName) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post('/overload-requests', { courseId });
      if (response.data.success) {
        setSuccess(`Overload approval requested for ${courseName}`);
        loadOverloadRequests();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to request approval');
    }
  };

  const getCurrentCredits = () => {
    return registeredCourses.reduce((sum, reg) => {
      const c = reg.courseId;
      const credits = c && typeof c.credits === 'number' ? c.credits : 0;
      return sum + credits;
    }, 0);
  };

  const getCurrentCreditsForSemester = (semester) => {
    const semNum = Number(semester);
    if (!Number.isFinite(semNum)) return 0;
    return registeredCourses.reduce((sum, reg) => {
      const c = reg.courseId;
      if (!c) return sum;
      const cSem = typeof c.semester === 'number' ? c.semester : Number(c.semester);
      if (!Number.isFinite(cSem) || cSem !== semNum) return sum;
      const credits = typeof c.credits === 'number' ? c.credits : Number(c.credits);
      return sum + (Number.isFinite(credits) ? credits : 0);
    }, 0);
  };

  const hasPendingOverloadForCourse = (courseId) => {
    return overloadRequests.some(
      (req) =>
        req.status === 'pending' &&
        (req.courseId?._id === courseId || req.courseId === courseId)
    );
  };

  // Check if course is already registered
  const isAlreadyRegistered = (courseId) => {
    if (!courseId) return false;
    return registeredCourseIds.some(id => 
      id?.toString() === courseId?.toString()
    );
  };

  const isOnWaitlist = (courseId) => {
    if (!courseId) return false;
    return waitlistedCourseIds.some((id) => id?.toString() === courseId?.toString());
  };

  const hasPassedCourse = (courseId) => {
    if (!courseId) return false;
    return allRegistrations.some((reg) => {
      const regCourseId = reg.courseId?._id || reg.courseId;
      const marks = typeof reg.marks === 'number' ? reg.marks : Number(reg.marks);
      return (
        regCourseId?.toString() === courseId?.toString() &&
        reg.status === 'completed' &&
        Number.isFinite(marks) &&
        marks >= 60
      );
    });
  };

  const latestCompletedMarksByCourse = useMemo(() => {
    const map = new Map();
    (allRegistrations || []).forEach((reg) => {
      if (reg.status !== 'completed') return;
      const regCourseId = reg.courseId?._id || reg.courseId;
      if (!regCourseId) return;
      const marks = typeof reg.marks === 'number' ? reg.marks : Number(reg.marks);
      if (!Number.isFinite(marks)) return;
      const attempt = typeof reg.attempt === 'number' ? reg.attempt : Number(reg.attempt) || 0;
      const key = regCourseId.toString();
      const prev = map.get(key);
      if (!prev || attempt > prev.attempt) {
        map.set(key, { marks, attempt });
      }
    });
    return map;
  }, [allRegistrations]);

  const isImprovementEligible = (courseId) => {
    if (!courseId) return false;
    const latest = latestCompletedMarksByCourse.get(courseId.toString());
    if (!latest) return false;
    return latest.marks >= 50 && latest.marks < 60;
  };

  const isRetakeEligible = (courseId) => {
    if (!courseId) return false;
    const latest = latestCompletedMarksByCourse.get(courseId.toString());
    if (!latest) return false;
    return latest.marks < 50;
  };

  /** First-time registration for a course from an earlier catalog semester (deferred/backlog). */
  const isBacklogEligible = (courseId, courseSemester, currentStudentSemester) => {
    if (!courseId || !Number.isFinite(currentStudentSemester) || !Number.isFinite(courseSemester)) return false;
    if (courseSemester >= currentStudentSemester) return false;
    return !latestCompletedMarksByCourse.has(courseId.toString());
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

  const studentSemester = Number(user?.semester);
  const coursesBySemester = groupCoursesBySemester();
  const semesters = Object.keys(coursesBySemester).sort((a, b) => parseInt(a) - parseInt(b));
  const currentCredits = getCurrentCredits();

  return (
    <div className="page-container">
      <h1>Course Registration</h1>
      {Number.isFinite(studentSemester) && (
        <p style={{ marginBottom: '12px', color: '#475569', fontSize: '0.9rem' }}>
          Your current semester: <strong>{studentSemester}</strong>. You may register current-semester courses,
          or <strong>deferred (backlog)</strong> courses from earlier semesters you have not attempted yet.
        </p>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {courses.length === 0 ? (
        <p>No courses available for registration.</p>
      ) : (
        <div>
          {semesters.map((semester) => (
            <div key={semester} style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                color: '#4f46e5',
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                Semester {semester}
              </h2>
              <div className="courses-list">
                {coursesBySemester[semester].map((course) => {
                  const courseSemester = Number(course.semester);
                  const alreadyRegistered = isAlreadyRegistered(course._id);
                  const onWaitlist = isOnWaitlist(course._id);
                  const alreadyPassed = hasPassedCourse(course._id);
                  const improvementEligible = isImprovementEligible(course._id);
                  const retakeEligible = isRetakeEligible(course._id);
                  const backlogEligible = isBacklogEligible(course._id, courseSemester, studentSemester);
                  const waitlistLabel = improvementEligible
                    ? 'On waitlist (Improve)'
                    : retakeEligible
                      ? 'On waitlist (Retake)'
                      : 'On waitlist';
                  const deadlinePassed = isDeadlinePassed(course.registrationEndDate);
                  const registrationNotStarted = !isRegistrationStarted(course.registrationStartDate);
                  const futureSemesterCourse =
                    Number.isFinite(studentSemester) &&
                    Number.isFinite(courseSemester) &&
                    courseSemester > studentSemester;
                  const canRegister =
                    !deadlinePassed &&
                    !registrationNotStarted &&
                    !alreadyRegistered &&
                    !onWaitlist &&
                    !alreadyPassed &&
                    !futureSemesterCourse &&
                    (courseSemester >= studentSemester || backlogEligible || improvementEligible || retakeEligible);
                  const pendingOverload = hasPendingOverloadForCourse(course._id);
                  const currentSemesterCredits = getCurrentCreditsForSemester(course.semester);
                  const creditsIfAdded = currentSemesterCredits + (Number(course.credits) || 0);
                  
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
                          padding: '6px 10px', 
                          backgroundColor: '#d1ecf1', 
                          border: '1px solid #0c5460',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#0c5460',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Already Registered
                        </div>
                      ) : onWaitlist ? (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#fff3cd',
                          border: '1px solid #f59e0b',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#92400e',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          {waitlistLabel}
                        </div>
                      ) : alreadyPassed ? (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #94a3b8',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#334155',
                          fontWeight: '600',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Cannot register again: already passed (60+ marks)
                        </div>
                      ) : registrationNotStarted ? (
                        <div style={{ 
                          padding: '6px 10px', 
                          backgroundColor: '#fff3cd', 
                          border: '1px solid #ffc107',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#856404',
                          fontWeight: '500',
                          fontSize: '0.7rem',
                          marginTop: '8px'
                        }}>
                          Registration Not Started Yet
                        </div>
                      ) : deadlinePassed ? (
                        <div style={{ 
                          padding: '6px 10px', 
                          backgroundColor: '#f8d7da', 
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#721c24',
                          fontWeight: '500',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Deadline Passed
                        </div>
                      ) : futureSemesterCourse ? (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#f8d7da',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#721c24',
                          fontWeight: '500',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Cannot register: this is a Semester {courseSemester} course (your current semester is {studentSemester})
                        </div>
                      ) : !canRegister ? null : pendingOverload ? (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#e0f2fe',
                          border: '1px solid #38bdf8',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#0369a1',
                          fontWeight: '500',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Approval requested from admin (pending)
                        </div>
                      ) : creditsIfAdded <= 18 ? (
                        <button
                          onClick={() => handleRegister(course._id, course.courseName)}
                          className="btn btn-primary"
                          style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {improvementEligible ? 'Improve' : retakeEligible ? 'Retake' : backlogEligible ? 'Register (Backlog)' : 'Register'}
                        </button>
                      ) : creditsIfAdded <= 21 ? (
                        <button
                          onClick={() => handleRequestOverload(course._id, course.courseName)}
                          className="btn btn-secondary"
                          style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {improvementEligible ? 'Get improve approval from admin' : retakeEligible ? 'Get retake approval from admin' : 'Get approval from admin'}
                        </button>
                      ) : (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#f8d7da',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          textAlign: 'center',
                          color: '#721c24',
                          fontWeight: '500',
                          fontSize: '0.75rem',
                          marginTop: '8px'
                        }}>
                          Cannot register: exceeds 21 credit limit for Semester {courseSemester}
                        </div>
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
