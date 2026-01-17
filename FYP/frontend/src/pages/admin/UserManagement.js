import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const UserManagement = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    registrationNo: '',
    email: '',
    role: 'student'
  });

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/users/pending');
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

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
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
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Excel Format Guide */}
      <div className="card" style={{ marginBottom: '25px', backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9' }}>
        <h2 style={{ marginTop: '0', color: '#0c4a6e' }}>📋 Excel Upload Format Guide</h2>
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
            <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#075985' }}>📝 Example Excel Sheet:</p>
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
              <strong>⚠️ Important:</strong> 
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

      {showForm && (
        <div className="card">
          <h2>Add Pending User</h2>
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
      )}

      <div className="card">
        <h2>Pending Users</h2>
        {pendingUsers.length === 0 ? (
          <p className="no-data">No pending users found.</p>
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
    </div>
  );
};

export default UserManagement;
