import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BarChart3, 
  BookOpen, 
  ClipboardList, 
  School, 
  Calendar, 
  Users,
  FileEdit,
  Library,
  Clock,
  FileText,
  GraduationCap,
  ClipboardCheck
} from 'lucide-react';

const Sidebar = ({ isOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return null;
  }

  // Admin menu items
  const adminMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/statistics', label: 'Statistics', icon: BarChart3 },
    { path: '/admin/courses', label: 'Course Management', icon: BookOpen },
    { path: '/admin/allocations', label: 'Course Allocation', icon: ClipboardList },
    { path: '/admin/classrooms', label: 'Classroom Management', icon: School },
    { path: '/admin/timetable', label: 'Timetable Management', icon: Calendar },
    { path: '/admin/exam-datesheets', label: 'Exam Datesheet', icon: FileText },
    { path: '/admin/marks', label: 'Marks Entry', icon: GraduationCap },
    { path: '/admin/overload-approvals', label: 'Overload Approvals', icon: Clock },
    { path: '/admin/users', label: 'User Management', icon: Users }
  ];

  // Student menu items
  const studentMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/student/registration', label: 'Register Courses', icon: FileEdit },
    { path: '/student/courses', label: 'My Courses', icon: Library },
    { path: '/student/attendance', label: 'My Attendance', icon: ClipboardCheck },
    { path: '/student/timetable', label: 'Timetable', icon: Clock },
    { path: '/student/exam-datesheet', label: 'Exam Schedule', icon: FileText },
    { path: '/student/results', label: 'My Results', icon: GraduationCap }
  ];

  // Teacher menu items
  const teacherMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/teacher/allocated-courses', label: 'Allocated Courses', icon: BookOpen },
    { path: '/teacher/timetable', label: 'My Timetable', icon: Clock },
    { path: '/teacher/exam-datesheet', label: 'Exam Schedule', icon: FileText },
    { path: '/teacher/attendance', label: 'Mark Attendance', icon: ClipboardCheck },
    { path: '/teacher/attendance-view', label: 'View Attendance', icon: ClipboardCheck }
  ];

  const menuItems = user.role === 'admin' 
    ? adminMenuItems 
    : user.role === 'student' 
    ? studentMenuItems 
    : teacherMenuItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        {!isOpen && <h2>☰</h2>}
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (
            item.path !== '/dashboard' &&
            location.pathname.startsWith(`${item.path}/`)
          );
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              data-label={item.label}
              title={isOpen ? '' : item.label}
            >
              <IconComponent className="sidebar-icon" size={20} />
              {isOpen && <span className="sidebar-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

