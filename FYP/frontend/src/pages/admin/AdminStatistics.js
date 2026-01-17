import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './AdminPages.css';

const AdminStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/statistics');
      if (response.data.success && response.data.statistics) {
        setStats(response.data.statistics);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load statistics';
      setError(errorMessage);
      console.error('Statistics loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (error && !loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Dashboard Statistics</h1>
          <button onClick={loadStatistics} className="btn btn-secondary">Retry</button>
        </div>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!stats && !loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Admin Dashboard Statistics</h1>
          <button onClick={loadStatistics} className="btn btn-secondary">Refresh</button>
        </div>
        <div className="no-data">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin Dashboard Statistics</h1>
        <button onClick={loadStatistics} className="btn btn-secondary">Refresh</button>
      </div>

      {/* User Statistics */}
      <div className="stats-section">
        <h2>User Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.users?.totalStudents || 0}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-value">{stats.users?.totalTeachers || 0}</div>
            <div className="stat-label">Total Teachers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-value">{stats.users?.totalAdmins || 0}</div>
            <div className="stat-label">Total Admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.users?.pendingUsers || 0}</div>
            <div className="stat-label">Pending Users</div>
          </div>
        </div>
      </div>

      {/* Course Statistics */}
      <div className="stats-section">
        <h2>Course Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{stats.courses?.totalCourses || 0}</div>
            <div className="stat-label">Total Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔴</div>
            <div className="stat-value">{stats.courses?.fullCourses || 0}</div>
            <div className="stat-label">Full Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟡</div>
            <div className="stat-value">{stats.courses?.nearlyFullCourses || 0}</div>
            <div className="stat-label">Nearly Full (80%+)</div>
          </div>
        </div>

        {stats.courses?.coursesBySemester && stats.courses.coursesBySemester.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Courses by Semester</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Number of Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.courses.coursesBySemester.map(item => (
                    <tr key={item._id}>
                      <td>Semester {item._id}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.courses?.capacityStats && stats.courses.capacityStats.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Top Courses by Capacity Utilization</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Registered</th>
                    <th>Max Capacity</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.courses.capacityStats.map(course => (
                    <tr key={course.courseId}>
                      <td>{course.courseCode}</td>
                      <td>{course.courseName}</td>
                      <td>{course.registered}</td>
                      <td>{course.maxStudents}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            flex: 1,
                            height: '20px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '10px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${course.utilization}%`,
                              height: '100%',
                              backgroundColor: course.utilization >= 100 ? '#dc3545' : 
                                              course.utilization >= 80 ? '#ff9800' : '#28a745',
                              transition: 'width 0.3s'
                            }}></div>
                          </div>
                          <span>{course.utilization}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Registration Statistics */}
      <div className="stats-section">
        <h2>Registration Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.registrations?.totalRegistrations || 0}</div>
            <div className="stat-label">Active Registrations</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats.registrations?.droppedRegistrations || 0}</div>
            <div className="stat-label">Dropped Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">{stats.registrations?.recentRegistrations || 0}</div>
            <div className="stat-label">New (Last 7 Days)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📉</div>
            <div className="stat-value">{stats.registrations?.recentDrops || 0}</div>
            <div className="stat-label">Drops (Last 7 Days)</div>
          </div>
        </div>
      </div>

      {/* Timetable Statistics */}
      <div className="stats-section">
        <h2>Timetable Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{stats.timetable?.totalEntries || 0}</div>
            <div className="stat-label">Total Timetable Entries</div>
          </div>
        </div>

        {stats.timetable?.byDay && stats.timetable.byDay.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Timetable Entries by Day</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Number of Classes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.timetable.byDay.map(item => (
                    <tr key={item._id}>
                      <td>{item._id}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Allocation Statistics */}
      <div className="stats-section">
        <h2>Allocation Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.allocations?.totalAllocations || 0}</div>
            <div className="stat-label">Total Allocations</div>
          </div>
        </div>

        {stats.allocations?.topTeachers && stats.allocations.topTeachers.length > 0 && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>Top Teachers by Course Allocation</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Teacher Name</th>
                    <th>Number of Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.allocations.topTeachers.map(item => (
                    <tr key={item._id}>
                      <td>{item.teacherName || 'Unknown'}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Classroom Statistics */}
      <div className="stats-section">
        <h2>Classroom Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏫</div>
            <div className="stat-value">{stats.classrooms?.totalClassrooms || 0}</div>
            <div className="stat-label">Total Classrooms</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💺</div>
            <div className="stat-value">{stats.classrooms?.totalCapacity || 0}</div>
            <div className="stat-label">Total Capacity</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;




