import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { exportTimetableToPDF } from '../../utils/exportUtils';
import './AdminPages.css';
import '../student/StudentPages.css';
import { AlertTriangle } from 'lucide-react';

const TimetableManagement = () => {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateData] = useState({});
  const [conflictInfo, setConflictInfo] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [movingEntryId, setMovingEntryId] = useState('');
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    courseId: '',
    teacherId: '',
    classId: '',
    day: '',
    startTime: '',
    endTime: '',
    semester: '',
    academicYear: ''
  });

  useEffect(() => {
    loadTimetable();
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [coursesRes, teachersRes, classesRes] = await Promise.all([
        api.get('/courses').catch(() => ({ data: { courses: [] } })),
        api.get('/users?role=teacher').catch(() => ({ data: { users: [] } })),
        api.get('/classes').catch(() => ({ data: { classes: [] } }))
      ]);
      setCourses(coursesRes.data.courses || []);
      setTeachers(teachersRes.data.users || []);
      setClasses(classesRes.data.classes || []);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/timetable');
      
      if (response.data.success) {
        const timetables = response.data.timetables || [];
        // Filter out entries with missing required data
        const validTimetables = timetables.filter(t => {
          return t.courseId && t.teacherId && t.classId && t.day && t.startTime && t.endTime;
        });
        setTimetable(validTimetables);
        
        if (validTimetables.length === 0 && timetables.length > 0) {
          setError('Found timetable entries but they are missing required data.');
        }
      } else {
        setTimetable([]);
        setError(response.data.message || 'Failed to load timetable');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load timetable');
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setConflictInfo(null);
      setLoading(true);
      console.log('Generating timetable with data:', generateData);
      const response = await api.post('/timetable/generate', generateData);
      console.log('Timetable generation response:', response.data);
      setSuccess(response.data.message);
      setConflictInfo({
        totalScheduled: response.data.totalScheduled,
        totalConflicts: response.data.totalConflicts,
        unresolvedConflicts: response.data.unresolvedConflicts || []
      });
      setShowGenerateForm(false);
      loadTimetable();
    } catch (error) {
      console.error('Timetable generation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate timetable';
      setError(`Error: ${errorMessage}. ${error.response?.data?.error ? 'Check console for details.' : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete(`/timetable/${id}`);
      setSuccess('Timetable entry deleted successfully. Changes will be reflected on student and teacher timetables.');
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete timetable entry');
    }
  };

  const handleAddClick = () => {
    setSelectedEntry(null);
    setFormData({
      courseId: '',
      teacherId: '',
      classId: '',
      day: '',
      startTime: '',
      endTime: '',
      semester: '',
      academicYear: ''
    });
    setShowAddForm(true);
  };

  const handleUpdateClick = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      courseId: entry.courseId?._id || entry.courseId || '',
      teacherId: entry.teacherId?._id || entry.teacherId || '',
      classId: entry.classId?._id || entry.classId || '',
      day: entry.day || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      semester: entry.semester || '',
      academicYear: entry.academicYear || ''
    });
    setShowUpdateForm(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await api.post('/timetable', formData);
      setSuccess('Timetable entry added successfully. Changes will be reflected on student and teacher timetables.');
      setShowAddForm(false);
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add timetable entry');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await api.put(`/timetable/${selectedEntry._id}`, formData);
      setSuccess('Timetable entry updated successfully. Changes will be reflected on student and teacher timetables.');
      setShowUpdateForm(false);
      setSelectedEntry(null);
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update timetable entry');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete the entire timetable?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await api.delete('/timetable');
      setSuccess('All timetable entries deleted successfully');
      loadTimetable();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete timetable');
    }
  };

  // Format time range for display: "9:00-10:30"
  const formatTimeRange = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes}`;
    };
    return `${formatSingleTime(startTime)}-${formatSingleTime(endTime)}`;
  };
  
  // Format time range for header: "9:00 TO 10:30"
  const formatTimeRangeHeader = (startTime, endTime) => {
    const formatSingleTime = (time) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      return `${hour}:${minutes}`;
    };
    return `${formatSingleTime(startTime)} TO ${formatSingleTime(endTime)}`;
  };

  // Extract unique time ranges from timetable entries
  const getUniqueTimeRanges = () => {
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const timeRangeSet = new Set();
    timetable.forEach(entry => {
      const rangeKey = `${entry.startTime}-${entry.endTime}`;
      timeRangeSet.add(rangeKey);
    });

    // Convert to array and sort by start time
    const timeRanges = Array.from(timeRangeSet).map(range => {
      const [startTime, endTime] = range.split('-');
      return { startTime, endTime };
    }).sort((a, b) => {
      const aStart = parseTime(a.startTime);
      const bStart = parseTime(b.startTime);
      return aStart - bStart;
    });

    return timeRanges;
  };

  const timeRanges = getUniqueTimeRanges();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getTimetableEntries = (day, timeRange) => {
    return timetable.filter(entry => {
      if (entry.day !== day) return false;
      return entry.startTime === timeRange.startTime && entry.endTime === timeRange.endTime;
    });
  };

  const handleDragStart = (entry) => {
    setDraggedEntry(entry);
    setDropTarget(null);
    setError('');
    setSuccess('');
  };

  const handleDragEnd = () => {
    setDraggedEntry(null);
    setDropTarget(null);
  };

  const handleDropOnCell = async (targetDay, targetRange) => {
    if (!draggedEntry) return;

    const isSameSlot =
      draggedEntry.day === targetDay &&
      draggedEntry.startTime === targetRange.startTime &&
      draggedEntry.endTime === targetRange.endTime;
    if (isSameSlot) {
      setDraggedEntry(null);
      setDropTarget(null);
      return;
    }

    try {
      setError('');
      setSuccess('');
      setMovingEntryId(draggedEntry._id);

      const payload = {
        day: targetDay,
        startTime: targetRange.startTime,
        endTime: targetRange.endTime
      };

      await api.put(`/timetable/${draggedEntry._id}`, payload);
      setSuccess(
        `${draggedEntry.courseId?.courseCode || 'Course'} moved to ${targetDay} ${formatTimeRange(
          targetRange.startTime,
          targetRange.endTime
        )}.`
      );
      await loadTimetable();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Unable to move entry. This slot may have teacher/class/student conflicts.'
      );
    } finally {
      setMovingEntryId('');
      setDraggedEntry(null);
      setDropTarget(null);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container timetable-page">
      <div className="page-header">
        <h1>Timetable Management</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexDirection: 'row' }}>
          <button 
            onClick={() => setShowGenerateForm(true)} 
            className="btn btn-primary"
          >
            Generate Timetable
          </button>
          <button 
            onClick={handleAddClick} 
            className="btn btn-primary"
          >
            Add Entry
          </button>
          {timetable.length > 0 && (
            <>
              <button 
                onClick={() => exportTimetableToPDF(timetable)} 
                className="btn btn-primary"
              >
                Download PDF
              </button>
              <button 
                onClick={handleDeleteAll} 
                className="btn btn-secondary"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {conflictInfo && conflictInfo.unresolvedConflicts.length > 0 && (
        <div className="alert alert-warning" style={{ marginTop: '15px' }}>
          <strong><AlertTriangle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Unresolved Conflicts Detected:</strong>
          <p>Some courses could not be scheduled without conflicts. Student conflicts are prioritized and avoided.</p>
          <ul style={{ marginTop: '10px', marginBottom: 0 }}>
            {conflictInfo.unresolvedConflicts.map((conflict, idx) => (
              <li key={idx}>
                <strong>{conflict.courseName || conflict.courseId}</strong>
                {conflict.conflicts && (
                  <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                    {conflict.conflicts.student && conflict.conflicts.student.length > 0 && (
                      <li>Student conflicts: {conflict.conflicts.student.length}</li>
                    )}
                    {conflict.conflicts.teacher && conflict.conflicts.teacher.length > 0 && (
                      <li>Teacher conflicts: {conflict.conflicts.teacher.length}</li>
                    )}
                    {conflict.conflicts.classroom && conflict.conflicts.classroom.length > 0 && (
                      <li>Classroom conflicts: {conflict.conflicts.classroom.length}</li>
                    )}
                  </ul>
                )}
                {conflict.message && <span> - {conflict.message}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Entry Form */}
      {showAddForm && (
        <div className="gen-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="gen-modal" style={{ width: 'min(680px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>Add Timetable Entry</h2>
              <button type="button" className="gen-modal__close" onClick={() => setShowAddForm(false)}>✕</button>
            </div>
          <form onSubmit={handleAddSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Course</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode} - {course.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  required
                >
                  <option value="">Select a teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} ({teacher.registrationNo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Classroom</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">Select a classroom</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.className} - {cls.location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  <option value="">Select a day</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g., 2024-2025"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Add Entry</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Update Entry Form */}
      {showUpdateForm && selectedEntry && (
        <div className="gen-modal-overlay" onClick={() => { setShowUpdateForm(false); setSelectedEntry(null); }}>
          <div className="gen-modal" style={{ width: 'min(680px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>Update Timetable Entry</h2>
              <button type="button" className="gen-modal__close" onClick={() => { setShowUpdateForm(false); setSelectedEntry(null); }}>✕</button>
            </div>
          <form onSubmit={handleUpdateSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Course</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.courseCode} - {course.courseName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Teacher</label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  required
                >
                  <option value="">Select a teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} ({teacher.registrationNo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Classroom</label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  <option value="">Select a classroom</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.className} - {cls.location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Day</label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                >
                  <option value="">Select a day</option>
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Academic Year</label>
                <input
                  type="text"
                  placeholder="e.g., 2024-2025"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary">Update Entry</button>
              <button type="button" onClick={() => { setShowUpdateForm(false); setSelectedEntry(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
          </div>
        </div>
      )}

      {showGenerateForm && (
        <div className="gen-modal-overlay" onClick={() => setShowGenerateForm(false)}>
          <div className="gen-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>Generate Timetable</h2>
              <button type="button" className="gen-modal__close" onClick={() => setShowGenerateForm(false)}>✕</button>
            </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Timetable will be generated for all degree levels (BS, Master, MPhil) and all semesters (1-12).
          </p>
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Timetable will be generated for the current academic year, all semesters (1-12), and all degree levels (BS, Master, MPhil)
              </small>
            </div>
            
            <button type="submit" className="btn btn-primary">Generate Timetable</button>
          </form>
          </div>
        </div>
      )}

      {timetable.length === 0 && !loading ? (
        <p className="no-data">No timetable entries. Generate a timetable to get started.</p>
      ) : (
        <div className="timetable-container" style={{ marginTop: '20px' }}>
          <div
            style={{
              marginBottom: '10px',
              color: '#475569',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            Drag a subject card and drop it on another slot to move it.
          </div>
          <table className="timetable-table">
            <thead>
              <tr>
                <th className="day-cell">Day</th>
                {timeRanges.map((timeRange) => (
                  <th 
                    key={`${timeRange.startTime}-${timeRange.endTime}`} 
                    className="time-header" 
                    title={formatTimeRangeHeader(timeRange.startTime, timeRange.endTime)}
                  >
                    {formatTimeRangeHeader(timeRange.startTime, timeRange.endTime)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day}>
                  <td className="day-cell">{day}</td>
                  {timeRanges.map((timeRange) => {
                    const entries = getTimetableEntries(day, timeRange);
                    return (
                      <td 
                        key={`${timeRange.startTime}-${timeRange.endTime}`} 
                        className={entries.length > 0 ? 'timetable-cell filled' : 'timetable-cell'}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!draggedEntry) return;
                          setDropTarget({ day, startTime: timeRange.startTime, endTime: timeRange.endTime });
                        }}
                        onDragLeave={() => {
                          setDropTarget((prev) => {
                            if (!prev) return null;
                            if (
                              prev.day === day &&
                              prev.startTime === timeRange.startTime &&
                              prev.endTime === timeRange.endTime
                            ) {
                              return null;
                            }
                            return prev;
                          });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnCell(day, timeRange);
                        }}
                        style={
                          dropTarget &&
                          dropTarget.day === day &&
                          dropTarget.startTime === timeRange.startTime &&
                          dropTarget.endTime === timeRange.endTime
                            ? { outline: '2px dashed #3b82f6', outlineOffset: '-3px', background: '#eff6ff' }
                            : undefined
                        }
                      >
                        {entries.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {entries.map((entry, idx) => {
                              const courseName = entry.courseId?.courseName || 'N/A';
                              const truncatedName = courseName.length > 12 
                                ? courseName.substring(0, 12) + '...' 
                                : courseName;
                              
                              return (
                                <div 
                                  key={entry._id}
                                  className="timetable-entry"
                                  draggable
                                  onDragStart={() => handleDragStart(entry)}
                                  onDragEnd={handleDragEnd}
                                  title={`${entry.courseId?.courseCode || 'N/A'} - ${entry.courseId?.courseName || 'N/A'} | ${entry.teacherId?.name || 'N/A'} | ${entry.classId?.className || 'N/A'} | ${formatTimeRange(entry.startTime, entry.endTime)} | Semester: ${entry.semester || 'N/A'}`}
                                  style={{ 
                                    marginBottom: entries.length > 1 ? '4px' : '0',
                                    position: 'relative',
                                    overflow: 'visible',
                                    pointerEvents: 'auto',
                                    cursor: movingEntryId === entry._id ? 'progress' : 'grab',
                                    opacity: movingEntryId === entry._id ? 0.6 : 1
                                  }}
                                >
                                  <div className="timetable-entry-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <strong className="course-code" style={{ flex: 1 }}>{entry.courseId?.courseCode || 'N/A'}</strong>
                                  </div>
                                  <div className="timetable-entry-time" style={{ fontSize: '0.6rem', marginBottom: '3px' }}>
                                    {formatTimeRange(entry.startTime, entry.endTime)}
                                  </div>
                                  <div className="timetable-entry-title" style={{ fontSize: '0.65rem', marginBottom: '3px', fontWeight: '500' }}>
                                    {truncatedName}
                                  </div>
                                  <div className="timetable-entry-instructor" style={{ fontSize: '0.6rem', color: '#555', fontWeight: '500', marginTop: '4px', marginBottom: '2px' }}>
                                    {entry.teacherId?.name || 'N/A'}
                                  </div>
                                  <div style={{ fontSize: '0.55rem', color: '#888', marginTop: '2px', marginBottom: '4px' }}>
                                    {entry.classId?.className || 'N/A'} | S{entry.semester || 'N/A'}
                                  </div>
                                  <div 
                                    style={{ 
                                      display: 'flex', 
                                      gap: '4px', 
                                      marginTop: '6px', 
                                      paddingTop: '4px', 
                                      borderTop: '1px solid #eee',
                                      position: 'relative',
                                      zIndex: 10,
                                      pointerEvents: 'auto'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      draggable={false}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleUpdateClick(entry);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        fontSize: '0.65rem',
                                        background: '#0d4d73',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        position: 'relative',
                                        zIndex: 11,
                                        pointerEvents: 'auto'
                                      }}
                                      onMouseEnter={(e) => e.target.style.background = '#082a3f'}
                                      onMouseLeave={(e) => e.target.style.background = '#0d4d73'}
                                      title="Update entry"
                                    >
                                      Update
                                    </button>
                                    <button
                                      type="button"
                                      draggable={false}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDelete(entry._id);
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        fontSize: '0.65rem',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        position: 'relative',
                                        zIndex: 11,
                                        pointerEvents: 'auto'
                                      }}
                                      onMouseEnter={(e) => e.target.style.background = '#545b62'}
                                      onMouseLeave={(e) => e.target.style.background = '#6c757d'}
                                      title="Remove entry"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default TimetableManagement;










