import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2,
  BookOpen,
  ClipboardList,
  GraduationCap,
  School,
  Calendar,
  Users,
  FileText,
  UserPlus,
  Library,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import './admin/AdminPages.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Admin Dashboard
  if (user.role === 'admin') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Welcome, {user.name}!</h1>
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/statistics')}>
            <div className="stat-icon"><BarChart2 size={40} strokeWidth={1.5} /></div>
            <h3>Statistics</h3>
            <p>View system-wide statistics and analytics</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/courses')}>
            <div className="stat-icon"><BookOpen size={40} strokeWidth={1.5} /></div>
            <h3>Course Management</h3>
            <p>Manage courses, add, edit, and delete courses</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/allocations')}>
            <div className="stat-icon"><ClipboardList size={40} strokeWidth={1.5} /></div>
            <h3>Course Allocation</h3>
            <p>Allocate courses to teachers and manage assignments</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/classrooms')}>
            <div className="stat-icon"><School size={40} strokeWidth={1.5} /></div>
            <h3>Classroom Management</h3>
            <p>Manage classrooms and facilities</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/timetable')}>
            <div className="stat-icon"><Calendar size={40} strokeWidth={1.5} /></div>
            <h3>Timetable Management</h3>
            <p>Generate and manage class timetables</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/users')}>
            <div className="stat-icon"><Users size={40} strokeWidth={1.5} /></div>
            <h3>User Management</h3>
            <p>Manage users and approve pending registrations</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/exam-datesheets')}>
            <div className="stat-icon"><FileText size={40} strokeWidth={1.5} /></div>
            <h3>Exam Datesheet</h3>
            <p>Generate and manage exam schedules</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/marks')}>
            <div className="stat-icon"><GraduationCap size={40} strokeWidth={1.5} /></div>
            <h3>Marks Entry</h3>
            <p>Enter subject marks, grades, and review CGPA</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/admin/overload-approvals')}>
            <div className="stat-icon"><Clock size={40} strokeWidth={1.5} /></div>
            <h3>Overload Approvals</h3>
            <p>Review and approve/reject teacher overload requests</p>
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
          {user.registrationNo && <p className="dashboard-info">Registration No: {user.registrationNo}</p>}
          {user.program && <p className="dashboard-info">Program: {user.program} - Semester {user.semester}</p>}
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/student/registration')}>
            <div className="stat-icon"><UserPlus size={40} strokeWidth={1.5} /></div>
            <h3>Course Registration</h3>
            <p>Register for courses and manage your selections</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/courses')}>
            <div className="stat-icon"><Library size={40} strokeWidth={1.5} /></div>
            <h3>My Courses</h3>
            <p>View your registered courses and course details</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/attendance')}>
            <div className="stat-icon"><ClipboardCheck size={40} strokeWidth={1.5} /></div>
            <h3>My Attendance</h3>
            <p>View attendance for your registered courses</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/timetable')}>
            <div className="stat-icon"><Clock size={40} strokeWidth={1.5} /></div>
            <h3>My Timetable</h3>
            <p>View your class schedule and timetable</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/exam-datesheet')}>
            <div className="stat-icon"><FileText size={40} strokeWidth={1.5} /></div>
            <h3>Exam Schedule</h3>
            <p>View your exam datesheet and schedule</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/student/results')}>
            <div className="stat-icon"><GraduationCap size={40} strokeWidth={1.5} /></div>
            <h3>My Results</h3>
            <p>View subject marks, grades, and your CGPA</p>
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
        </div>

        <div className="stats-grid">
          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/allocated-courses')}>
            <div className="stat-icon"><BookOpen size={40} strokeWidth={1.5} /></div>
            <h3>Allocated Courses</h3>
            <p>View your assigned courses and semester details</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/timetable')}>
            <div className="stat-icon"><Clock size={40} strokeWidth={1.5} /></div>
            <h3>My Timetable</h3>
            <p>View your teaching schedule and timetable</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/exam-datesheet')}>
            <div className="stat-icon"><FileText size={40} strokeWidth={1.5} /></div>
            <h3>Exam Schedule</h3>
            <p>View your exam datesheet and schedule</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/attendance')}>
            <div className="stat-icon"><ClipboardCheck size={40} strokeWidth={1.5} /></div>
            <h3>Mark Attendance</h3>
            <p>Select course/date and mark present or absent</p>
          </div>

          <div className="stat-card dashboard-card" onClick={() => navigate('/teacher/attendance-view')}>
            <div className="stat-icon"><ClipboardCheck size={40} strokeWidth={1.5} /></div>
            <h3>View Attendance</h3>
            <p>View subject attendance by selected date</p>
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
