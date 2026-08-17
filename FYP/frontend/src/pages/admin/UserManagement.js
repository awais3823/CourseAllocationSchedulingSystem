import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import './AdminPages.css';
import { FileText, AlertTriangle, Users, GraduationCap, User, Clock, Search } from 'lucide-react';

const UserManagement = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role'); // student | teacher | admin
  const initialStatus = searchParams.get('status'); // pending

  const getInitialTab = () => {
    if (initialStatus === 'pending') return 'pending';
    if (initialRole === 'student') return 'student';
    if (initialRole === 'teacher') return 'teacher';
    if (initialRole === 'admin') return 'admin';
    return 'pending';
  };

  const [pendingUsers, setPendingUsers] = useState([]);
  const [roleUsers, setRoleUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userSummary, setUserSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showExcelGuide, setShowExcelGuide] = useState(false);
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    registrationNo: '',
    email: '',
    role: 'student'
  });

  // Load overall user counts (students, teachers, admins, pending)
  useEffect(() => {
    const loadUserSummary = async () => {
      try {
        const response = await api.get('/statistics');
        if (response.data?.success && response.data.statistics?.users) {
          setUserSummary(response.data.statistics.users);
        }
      } catch (err) {
        // Keep page working even if statistics call fails
        console.error('Failed to load user summary:', err);
      }
    };
    loadUserSummary();
  }, []);

  const loadPendingUsers = useCallback(async (search = searchQuery) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/users/pending', {
        params: search.trim() ? { search: search.trim() } : {}
      });
      if (response.data && response.data.success) {
        setPendingUsers(response.data.pendingUsers || []);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error('Error loading pending users:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load pending users';
      setError(errorMessage);
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadUsersByRole = useCallback(async (role, search = searchQuery) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/users', {
        params: {
          role,
          ...(search.trim() ? { search: search.trim() } : {})
        }
      });
      if (response.data && response.data.success) {
        setRoleUsers(response.data.users || []);
      } else {
        setRoleUsers([]);
      }
    } catch (error) {
      console.error('Error loading users by role:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load users';
      setError(errorMessage);
      setRoleUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'pending') {
        loadPendingUsers(searchQuery);
      } else {
        loadUsersByRole(activeTab, searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, loadPendingUsers, loadUsersByRole]);

  const handleDeleteUser = async (userId, role) => {
    if (!window.confirm(`Are you sure you want to remove this ${role} and all related data (registrations, allocations, timetable entries)?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/users/${userId}`);
      setSuccess('User and related data removed successfully');
      loadUsersByRole(role);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await api.post('/users/pending', formData);
      setSuccess('Pending user added successfully');
      setShowForm(false);
      setFormData({ registrationNo: '', email: '', role: 'student' });
      loadPendingUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add pending user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pending user?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/users/pending/${id}`);
      setSuccess('Pending user deleted successfully');
      loadPendingUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete pending user');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/users/pending/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Users uploaded successfully');
      e.target.value = ''; // Reset file input
      loadPendingUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload users');
    }
  };

  // Full-page spinner only on first load (before we have summary/cards)
  if (loading && !userSummary) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container user-management-page">
      <div className="page-header">
        <h1>User Management</h1>
        {activeTab === 'pending' && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              Add User
            </button>
            <button
              type="button"
              onClick={() => setShowExcelGuide(!showExcelGuide)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={18} />
              {showExcelGuide ? 'Hide Excel upload guide' : 'Show Excel upload guide'}
            </button>
          </div>
        )}
      </div>

      {/* Filter cards: same structure and size as Statistics page (icon + value + label) */}
      {userSummary && (
        <div className="stats-section">
          <div className="stats-grid">
            <div
              className="stat-card admin-stat-card clickable"
              onClick={() => setActiveTab('student')}
            >
              <div className="stat-icon"><Users size={28} /></div>
              <div className="stat-value">{userSummary.totalStudents || 0}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div
              className="stat-card admin-stat-card clickable"
              onClick={() => setActiveTab('teacher')}
            >
              <div className="stat-icon"><GraduationCap size={28} /></div>
              <div className="stat-value">{userSummary.totalTeachers || 0}</div>
              <div className="stat-label">Total Teachers</div>
            </div>
            <div
              className="stat-card admin-stat-card clickable"
              onClick={() => setActiveTab('admin')}
            >
              <div className="stat-icon"><User size={28} /></div>
              <div className="stat-value">{userSummary.totalAdmins || 0}</div>
              <div className="stat-label">Total Admins</div>
            </div>
            <div
              className="stat-card admin-stat-card clickable"
              onClick={() => setActiveTab('pending')}
            >
              <div className="stat-icon"><Clock size={28} /></div>
              <div className="stat-value">{userSummary.pendingUsers || 0}</div>
              <div className="stat-label">Pending Users</div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card user-management-search-card">
        <label htmlFor="user-management-search" className="user-management-search-label">
          <Search size={18} aria-hidden />
          Search {activeTab === 'pending' ? 'pending users' : `${activeTab}s`}
        </label>
        <div className="user-management-search-row">
          <input
            id="user-management-search"
            type="search"
            className="user-management-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'pending'
                ? 'Registration no, email, or role...'
                : 'Registration no, name, or email...'
            }
            autoComplete="off"
          />
          {searchQuery.trim() && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>
        <p className="user-management-search-hint">
          {activeTab === 'pending'
            ? 'Matches registration number, email, or role.'
            : 'Matches registration number, name, or email.'}
        </p>
      </div>

      {/* Excel Format Guide - show only when admin toggles it on Pending tab */}
      {activeTab === 'pending' && showExcelGuide && (
      <div className="card" style={{ marginBottom: '25px', backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9' }}>
        <h2 style={{ marginTop: '0', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={24} /> Excel Upload Format Guide
        </h2>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ color: '#075985', marginBottom: '10px' }}>
            <strong>Required Format:</strong> Your Excel file (.xlsx or .xls) must have the following columns in the first row:
          </p>
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0ea5e9', color: 'white' }}>
                  <th style={{ padding: '10px', border: '1px solid #0284c7', textAlign: 'left' }}>Column Name</th>
                  <th style={{ padding: '10px', border: '1px solid #0284c7', textAlign: 'left' }}>Required</th>
                  <th style={{ padding: '10px', border: '1px solid #0284c7', textAlign: 'left' }}>Example Values</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', fontWeight: '600' }}>registrationNo</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', color: '#dc2626' }}>Yes</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd' }}>STU001, T001, ADMIN001</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', fontWeight: '600' }}>email</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', color: '#dc2626' }}>Yes</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd' }}>user@university.edu</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', fontWeight: '600' }}>role</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd', color: '#dc2626' }}>Yes</td>
                  <td style={{ padding: '8px', border: '1px solid #bae6fd' }}>student, teacher, or admin</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ background: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd', marginTop: '15px' }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#075985', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Example Excel Sheet:
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.8' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 250px 100px', gap: '10px', padding: '8px', backgroundColor: '#f8fafc' }}>
                <strong>registrationNo</strong>
                <strong>email</strong>
                <strong>role</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 250px 100px', gap: '10px', padding: '8px' }}>
                <span>STU001</span>
                <span>student1@university.edu</span>
                <span>student</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 250px 100px', gap: '10px', padding: '8px', backgroundColor: '#f8fafc' }}>
                <span>T001</span>
                <span>teacher1@university.edu</span>
                <span>teacher</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 250px 100px', gap: '10px', padding: '8px' }}>
                <span>ADMIN001</span>
                <span>admin@university.edu</span>
                <span>admin</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '4px' }}>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#92400e' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Important:
              </strong> 
              <ul style={{ margin: '8px 0 0 20px', padding: '0' }}>
                <li>First row must contain column headers exactly as shown above</li>
                <li>Column names are case-sensitive (use lowercase: registrationNo, email, role)</li>
                <li>Role must be one of: <strong>student</strong>, <strong>teacher</strong>, or <strong>admin</strong></li>
                <li>Email addresses must be valid and unique</li>
                <li>Registration numbers must be unique</li>
                <li>File size limit: 5MB</li>
              </ul>
            </p>
          </div>
        </div>
      </div>
      )}

      {showForm && activeTab === 'pending' && (
        <div className="gen-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="gen-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>Add Pending User</h2>
              <button type="button" className="gen-modal__close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  required
                  placeholder="e.g., STU001, T001"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@university.edu"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Add User</button>
            </form>
          </div>
        </div>
      )}

      {/* Pending users view */}
      {activeTab === 'pending' && (
        <div className="card">
          <h2>
            Pending Users
            {!loading && (
              <span className="user-management-result-count"> ({pendingUsers.length})</span>
            )}
          </h2>
          {loading ? (
            <div className="loading" style={{ minHeight: '120px' }}><div className="spinner"></div></div>
          ) : pendingUsers.length === 0 ? (
            <p className="no-data">
              {searchQuery.trim() ? 'No pending users match your search.' : 'No pending users found.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Registration No</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Added Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(user => (
                    <tr key={user._id}>
                      <td><strong>{user.registrationNo}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: user.role === 'admin' ? '#e7f3ff' : user.role === 'teacher' ? '#fff3cd' : '#d4edda',
                          color: user.role === 'admin' ? '#004085' : user.role === 'teacher' ? '#856404' : '#155724'
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filtered users by role (student/teacher/admin) */}
      {activeTab !== 'pending' && (
        <div className="card">
          <h2 style={{ textTransform: 'capitalize' }}>
            {activeTab} Users
            {!loading && (
              <span className="user-management-result-count"> ({roleUsers.length})</span>
            )}
          </h2>
          {loading ? (
            <div className="loading" style={{ minHeight: '120px' }}><div className="spinner"></div></div>
          ) : roleUsers.length === 0 ? (
            <p className="no-data">
              {searchQuery.trim()
                ? `No ${activeTab}s match your search.`
                : 'No users found for this role.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Registration No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roleUsers.map(user => (
                    <tr key={user._id}>
                      <td><strong>{user.registrationNo}</strong></td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(user._id, activeTab)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
