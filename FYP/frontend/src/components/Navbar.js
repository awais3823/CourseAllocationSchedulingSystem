import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import ProfileModal from './ProfileModal';
import ScheduliXLogo from './ScheduliXLogo';

const Navbar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            <ScheduliXLogo
              to="/dashboard"
              theme="onDark"
              size="compact"
              className="navbar-brand navbar-brand--logo"
            />
          </div>

          <div className="navbar-menu">
            <button
              className="navbar-user-dropdown"
              onClick={() => setShowProfile(true)}
              aria-label="Open profile"
            >
              <div className="navbar-user-avatar">
                {getInitials(user.name)}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
};

export default Navbar;
