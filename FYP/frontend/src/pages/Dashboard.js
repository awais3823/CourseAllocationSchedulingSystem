import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './admin/AdminPages.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin Dashboard
  if (user.role === 'admin') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Welcome, {user.name}!</h1>
          <p className="dashboard-role">Administrator Dashboard</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/statistics')}>
            <div className="stat-icon">📊</div>
            <h3>Statistics</h3>
            <p>View system-wide statistics and analytics</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/courses')}>
            <div className="stat-icon">📚</div>
            <h3>Course Management</h3>
            <p>Manage courses, add, edit, and delete courses</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/allocations')}>
            <div className="stat-icon">🎯</div>
            <h3>Course Allocation</h3>
            <p>Allocate courses to teachers and manage assignments</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/classrooms')}>
            <div className="stat-icon">🏫</div>
            <h3>Classroom Management</h3>
            <p>Manage classrooms and facilities</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/timetable')}>
            <div className="stat-icon">📅</div>
            <h3>Timetable Management</h3>
            <p>Generate and manage class timetables</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/users')}>
            <div className="stat-icon">👥</div>
            <h3>User Management</h3>
            <p>Manage users and approve pending registrations</p>
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard
  if (user.role === 'student') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Welcome, {user.name}!</h1>
          <p className="dashboard-role">Student Dashboard</p>
          {user.registrationNo && <p className="dashboard-info">Registration No: {user.registrationNo}</p>}
          {user.program && <p className="dashboard-info">Program: {user.program} - Semester {user.semester}</p>}
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/student/registration')}>
            <div className="stat-icon">📝</div>
            <h3>Course Registration</h3>
            <p>Register for courses and manage your selections</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/courses')}>
            <div className="stat-icon">📖</div>
            <h3>My Courses</h3>
            <p>View your registered courses and course details</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/timetable')}>
            <div className="stat-icon">📅</div>
            <h3>My Timetable</h3>
            <p>View your class schedule and timetable</p>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Dashboard
  if (user.role === 'teacher') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Welcome, {user.name}!</h1>
          <p className="dashboard-role">Teacher Dashboard</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/timetable')}>
            <div className="stat-icon">📅</div>
            <h3>My Timetable</h3>
            <p>View your teaching schedule and timetable</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown roles
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.name}!</h1>
        <p className="dashboard-role">Dashboard</p>
      </div>
      <div className="dashboard-info">
        <p>No specific dashboard available for your role.</p>
        <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;
