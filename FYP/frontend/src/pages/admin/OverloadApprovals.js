import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const OverloadApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRequests = async (status = filterStatus) => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      const res = await api.get('/overload-requests', { params });
      if (res.data.success) {
        setRequests(res.data.requests || []);
      } else {
        setError('Failed to load overload requests');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load overload requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests('pending');
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this overload request and register the course for the student?')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      const res = await api.post(`/overload-requests/${id}/approve`);
      if (res.data.success) {
        setSuccess('Request approved and course registered');
        loadRequests();
      } else {
        setError(res.data.message || 'Failed to approve request');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this overload request?')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      const res = await api.post(`/overload-requests/${id}/reject`);
      if (res.data.success) {
        setSuccess('Request rejected');
        loadRequests();
      } else {
        setError(res.data.message || 'Failed to reject request');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleStatusChange = (e) => {
    const next = e.target.value;
    setFilterStatus(next);
    loadRequests(next);
  };

  const filteredRequests = requests.filter((req) => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const student = req.studentId || {};
    const name = (student.name || '').toLowerCase();
    const regNo = (student.registrationNo || '').toLowerCase();
    return name.includes(q) || regNo.includes(q);
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Overload Approval Requests</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="allocation-search"
            placeholder="Search by student name or reg no"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: '250px' }}
          />
          <select
            value={filterStatus}
            onChange={handleStatusChange}
            className="status-filter-select"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => loadRequests()} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <p className="no-data">No overload requests found.</p>
      ) : (
        <div className="card">
          <h2>Requests</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg No</th>
                  <th>Course</th>
                  <th>Credits</th>
                  <th>Program / Semester</th>
                  <th>Current Credits</th>
                  <th>After Approval</th>
                  <th>Status</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const course = req.courseId || {};
                  const student = req.studentId || {};
                  return (
                    <tr key={req._id}>
                      <td>{student.name || 'Unknown'}</td>
                      <td>{student.registrationNo || '-'}</td>
                      <td>{course.courseCode} - {course.courseName}</td>
                      <td>{course.credits}</td>
                      <td>
                        {course.program || '-'}{course.semester ? ` / Sem ${course.semester}` : ''}
                      </td>
                      <td>{req.currentCredits}</td>
                      <td>{req.requestedTotalCredits}</td>
                      <td style={{ textTransform: 'capitalize' }}>{req.status}</td>
                      <td>{new Date(req.createdAt).toLocaleString()}</td>
                      <td>
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(req._id)}
                              className="btn btn-primary btn-sm"
                              style={{ marginRight: '6px' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req._id)}
                              className="btn btn-danger btn-sm"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverloadApprovals;

