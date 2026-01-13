import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const ClassroomManagement = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    className: '',
    capacity: '',
    location: '',
    facilities: ''
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/classes');
      setClasses(response.data.classes);
    } catch (error) {
      setError('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      const classData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        facilities: formData.facilities ? formData.facilities.split(',').map(f => f.trim()) : []
      };
      await api.post('/classes', classData);
      setSuccess('Classroom added successfully');
      setShowForm(false);
      setFormData({ className: '', capacity: '', location: '', facilities: '' });
      loadClasses();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add classroom');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/classes/${id}`);
      setSuccess('Classroom deleted successfully');
      loadClasses();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete classroom');
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Classroom Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Classroom'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <h2>Add New Classroom</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Classroom Name</label>
              <input
                type="text"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                required
                placeholder="e.g., A101"
              />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Building A, First Floor"
              />
            </div>
            <div className="form-group">
              <label>Facilities (comma-separated)</label>
              <input
                type="text"
                value={formData.facilities}
                onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                placeholder="e.g., Projector, Whiteboard, WiFi"
              />
            </div>
            <button type="submit" className="btn btn-primary">Add Classroom</button>
          </form>
        </div>
      )}

      <div className="classes-grid">
        {classes.map(classRoom => (
          <div key={classRoom._id} className="class-card">
            <h3>{classRoom.className}</h3>
            <p><strong>Capacity:</strong> {classRoom.capacity}</p>
            {classRoom.location && <p><strong>Location:</strong> {classRoom.location}</p>}
            {classRoom.facilities && classRoom.facilities.length > 0 && (
              <p><strong>Facilities:</strong> {classRoom.facilities.join(', ')}</p>
            )}
            <button
              onClick={() => handleDelete(classRoom._id)}
              className="btn btn-danger btn-sm"
              style={{ marginTop: '10px' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <p className="no-data">No classrooms found. Add a classroom to get started.</p>
      )}
    </div>
  );
};

export default ClassroomManagement;













