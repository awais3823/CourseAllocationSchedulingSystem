import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './StudentPages.css';

const MyCourses = () => {
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadRegistrations();
    loadWaitlist();
  }, []);

  const loadWaitlist = async () => {
    try {
      const response = await api.get('/registrations/waitlist');
      setWaitlist(response.data.waitlist || []);
    } catch (error) {
      console.error('Failed to load waitlist');
    }
  };

  const handleRemoveWaitlist = async (waitlistId, courseName) => {
    if (!window.confirm(`Remove ${courseName} from waitlist?`)) {
      return;
    }
    try {
      await api.delete(`/registrations/waitlist/${waitlistId}`);
      setSuccess('Removed from waitlist successfully');
      loadWaitlist();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove from waitlist');
    }
  };

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/registrations');
      setRegistrations(response.data.registrations);
    } catch (error) {
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (registrationId, courseName) => {
    if (!window.confirm(`Are you sure you want to drop ${courseName}?`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/registrations/${registrationId}`);
      setSuccess('Course dropped successfully');
      loadRegistrations();
      loadWaitlist();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to drop course');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const totalCredits = registrations.reduce((sum, reg) => sum + (reg.courseId?.credits || 0), 0);
  const droppedRegistrations = registrations.filter(reg => reg.status === 'dropped');
  const activeRegistrations = registrations.filter(reg => reg.status === 'registered');

  return (
    <div className="page-container">
      <h1>My Registered Courses</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {registrations.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '20px', 
          flexWrap: 'wrap' 
        }}>
          <div className="stat-card" style={{
            background: '#e7f3ff',
            padding: '15px 20px',
            borderRadius: '8px',
            border: '1px solid #007bff'
          }}>
            <strong>Total Credits:</strong> {totalCredits}
          </div>
          <div className="stat-card" style={{
            background: '#d4edda',
            padding: '15px 20px',
            borderRadius: '8px',
            border: '1px solid #28a745'
          }}>
            <strong>Active Courses:</strong> {activeRegistrations.length}
          </div>
          {droppedRegistrations.length > 0 && (
            <div className="stat-card" style={{
              background: '#f8d7da',
              padding: '15px 20px',
              borderRadius: '8px',
              border: '1px solid #dc3545'
            }}>
              <strong>Dropped Courses:</strong> {droppedRegistrations.length}
            </div>
          )}
        </div>
      )}

      {registrations.length === 0 ? (
        <p className="no-data">You haven't registered for any courses yet.</p>
      ) : (
        <>
          <h2>Active Registrations</h2>
          <table className="table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Semester</th>
              <th>Program</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map(reg => (
              <tr key={reg._id}>
                <td>{reg.courseId.courseCode}</td>
                <td>{reg.courseId.courseName}</td>
                <td>{reg.courseId.credits}</td>
                <td>{reg.courseId.semester}</td>
                <td>{reg.courseId.program}</td>
                <td>{new Date(reg.registrationDate).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => handleDrop(reg._id, reg.courseId.courseName)}
                    className="btn btn-danger btn-sm"
                  >
                    Drop
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
          {droppedRegistrations.length > 0 && (
            <>
              <h2 style={{ marginTop: '30px' }}>Course History (Dropped)</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Semester</th>
                    <th>Registration Date</th>
                    <th>Dropped Date</th>
                  </tr>
                </thead>
                <tbody>
                  {droppedRegistrations.map(reg => (
                    <tr key={reg._id} style={{ opacity: 0.7 }}>
                      <td>{reg.courseId?.courseCode || 'N/A'}</td>
                      <td>{reg.courseId?.courseName || 'N/A'}</td>
                      <td>{reg.courseId?.credits || 0}</td>
                      <td>{reg.courseId?.semester || 'N/A'}</td>
                      <td>{new Date(reg.registrationDate).toLocaleDateString()}</td>
                      <td>{reg.updatedAt ? new Date(reg.updatedAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {waitlist.length > 0 && (
            <>
              <h2 style={{ marginTop: '30px' }}>My Waitlist</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Credits</th>
                    <th>Semester</th>
                    <th>Added Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(item => (
                    <tr key={item._id}>
                      <td><strong>#{item.position}</strong></td>
                      <td>{item.courseId?.courseCode || 'N/A'}</td>
                      <td>{item.courseId?.courseName || 'N/A'}</td>
                      <td>{item.courseId?.credits || 0}</td>
                      <td>{item.courseId?.semester || 'N/A'}</td>
                      <td>{new Date(item.addedAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveWaitlist(item._id, item.courseId?.courseName)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyCourses;










