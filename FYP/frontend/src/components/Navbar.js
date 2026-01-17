import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <button 
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '☰' : '☰'}
          </button>
          <Link to="/dashboard" className="navbar-brand">
            Course Allocation System
          </Link>
        </div>
        
        <div className="navbar-menu">
          <div 
            className="navbar-user-dropdown"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="navbar-user-avatar">
              {getInitials(user.name)}
            </div>
            <span className="navbar-user-name">{user.name}</span>
            <span className="navbar-dropdown-arrow">▼</span>
            
            {showDropdown && (
              <div className="navbar-dropdown-menu">
                <div className="dropdown-item" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
