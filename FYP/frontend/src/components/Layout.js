import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import HelpSupportWidget from './HelpSupportWidget';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-layout">
      <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="app-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
          {children}
        </main>
      </div>
      <HelpSupportWidget />
    </div>
  );
};

export default Layout;

