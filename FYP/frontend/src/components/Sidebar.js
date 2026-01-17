import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return null;
  }

  // Admin menu items
  const adminMenuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/admin/statistics', label: 'Statistics' },
    { path: '/admin/courses', label: 'Course Management' },
    { path: '/admin/allocations', label: 'Course Allocation' },
    { path: '/admin/classrooms', label: 'Classroom Management' },
    { path: '/admin/timetable', label: 'Timetable Management' },
    { path: '/admin/users', label: 'User Management' }
  ];

  // Student menu items
  const studentMenuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/student/registration', label: 'Register Courses' },
    { path: '/student/courses', label: 'My Courses' },
    { path: '/student/timetable', label: 'Timetable' }
  ];

  // Teacher menu items
  const teacherMenuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/teacher/timetable', label: 'My Timetable' }
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
          const isActive = location.pathname === item.path || 
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              data-label={item.label}
              title={isOpen ? '' : item.label}
            >
              {isOpen ? item.label : ''}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;

