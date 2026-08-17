import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ExamDatesheetGrid from '../../components/ExamDatesheetGrid';
import './StudentPages.css';
import { Calendar, Clock, BookOpen, MapPin, AlertTriangle } from 'lucide-react';

const StudentExamDatesheet = () => {
  const { user } = useAuth();
  const [datesheets, setDatesheets] = useState([]);
  const [selectedDatesheet, setSelectedDatesheet] = useState(null);
  const [myExams, setMyExams] = useState([]);
  const [fullEntries, setFullEntries] = useState([]);
  const [showFullDatesheet, setShowFullDatesheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDatesheets();
  }, []);

  useEffect(() => {
    if (selectedDatesheet && user) {
      loadMyExams();
    }
  }, [selectedDatesheet, user]);

  useEffect(() => {
    if (selectedDatesheet && showFullDatesheet) {
      loadFullDatesheet();
    }
  }, [selectedDatesheet, showFullDatesheet]);

  const loadDatesheets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/exam-datesheets');
      if (response.data.success) {
        const datesheetsList = response.data.datesheets || [];
        setDatesheets(datesheetsList);
        // Auto-select the most recent datesheet
        if (datesheetsList.length > 0) {
          setSelectedDatesheet(datesheetsList[0]);
        }
      }
    } catch (error) {
      setError('Failed to load exam datesheets');
    } finally {
      setLoading(false);
    }
  };

  const loadMyExams = async () => {
    if (!selectedDatesheet || !user) return;

    try {
      const response = await api.get(`/exam-datesheets/${selectedDatesheet._id}`);
      if (response.data.success && response.data.views?.studentSchedules) {
        const mySchedule = response.data.views.studentSchedules[user.registrationNo];
        if (mySchedule && mySchedule.exams) {
          const exams = mySchedule.exams.map(exam => ({
            ...exam,
            examDate: exam.date || exam.examDate
          }));
          setMyExams(exams);
        } else {
          setMyExams([]);
        }
      }
    } catch (error) {
      console.error('Failed to load my exams:', error);
      setMyExams([]);
    }
  };

  const loadFullDatesheet = async () => {
    if (!selectedDatesheet) return;
    try {
      const response = await api.get(`/exam-datesheets/${selectedDatesheet._id}`);
      if (response.data.success && response.data.datesheet?.entries) {
        const entries = (response.data.datesheet.entries || []).map(entry => ({
          ...entry,
          examDate: entry.examDate ? new Date(entry.examDate).toISOString().slice(0, 10) : entry.examDate
        }));
        setFullEntries(entries);
      } else {
        setFullEntries([]);
      }
    } catch (err) {
      console.error('Failed to load full datesheet:', err);
      setFullEntries([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const displayExams = showFullDatesheet ? fullEntries : myExams;

  const groupExamsByDate = (exams) => {
    const grouped = {};
    (exams || []).forEach(exam => {
      const date = exam.examDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(exam);
    });
    // Sort dates
    return Object.keys(grouped).sort().reduce((acc, date) => {
      acc[date] = grouped[date].sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
      });
      return acc;
    }, {});
  };

  const examsByDate = groupExamsByDate(displayExams);

  /** Only real clashes: same time slot same day, or 3+ exams in one day. Morning + evening same day is allowed. */
  const checkScheduleClashes = () => {
    if (showFullDatesheet) return [];
    const clashes = [];
    Object.keys(examsByDate).forEach((date) => {
      const exams = examsByDate[date];
      if (exams.length >= 3) {
        clashes.push({ date, exams, reason: 'too-many' });
        return;
      }
      if (exams.length === 2) {
        const a = exams[0].timeSlot;
        const b = exams[1].timeSlot;
        if (a === b) {
          clashes.push({ date, exams, reason: 'same-slot' });
        }
      }
    });
    return clashes;
  };

  const scheduleClashes = checkScheduleClashes();

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container exam-datesheet-page">
      <div className="exam-datesheet-header">
        <h1>Exam Schedule</h1>
        <div className="exam-datesheet-controls">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFullDatesheet}
              onChange={(e) => setShowFullDatesheet(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Show full datesheet</span>
          </label>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!selectedDatesheet ? (
        <p className="no-data">No exam datesheets available.</p>
      ) : !showFullDatesheet && myExams.length === 0 ? (
        <p className="no-data">No exams scheduled for you in this datesheet.</p>
      ) : showFullDatesheet && fullEntries.length === 0 ? (
        <p className="no-data">No exam entries in this datesheet.</p>
      ) : (
        <>
          {selectedDatesheet && (
            <div className="card exam-summary-card" style={{ backgroundColor: '#f0f9ff' }}>
              <p><strong>Academic Year:</strong> {selectedDatesheet.academicYear}</p>
              <p><strong>Exam Period:</strong> {formatDate(selectedDatesheet.examPeriod?.startDate)} to {formatDate(selectedDatesheet.examPeriod?.endDate)}</p>
              <p><strong>Total Exams:</strong> {displayExams.length}</p>
              {showFullDatesheet && <p style={{ color: '#0369a1', fontWeight: 500 }}>Viewing full datesheet (all exams)</p>}
            </div>
          )}

          {!showFullDatesheet && scheduleClashes.length > 0 && (
            <div className="alert alert-warning">
              <strong><AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Schedule clash:</strong>
              <p>
                {scheduleClashes.some((c) => c.reason === 'same-slot')
                  ? 'You have two exams in the same session (morning or evening) on the same day.'
                  : 'You have more than two exams scheduled on the same day.'}
              </p>
              <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                {scheduleClashes.map((c, idx) => (
                  <li key={idx}>
                    <strong>{formatDate(c.date)}:</strong> {c.exams.map((e) => e.courseCode).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showFullDatesheet ? (
            <div className="card exam-schedule-card">
              <h2>Exam Schedule</h2>
              <ExamDatesheetGrid entries={fullEntries} />
            </div>
          ) : (
          <div className="card exam-schedule-card">
            <h2>Exam Schedule</h2>
            {Object.keys(examsByDate).map(date => (
              <div key={date} className="exam-date-group">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} />
                  {formatDate(date)}
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {examsByDate[date].map((exam, idx) => (
                    <div
                      key={idx}
                      className="course-card"
                      style={{
                        padding: '20px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', color: '#0B3C5D', fontSize: '1.1rem' }}>
                            {exam.courseCode} - {exam.courseName}
                          </h4>
                          <p style={{ margin: '4px 0', color: '#64748b', fontSize: '0.9rem' }}>
                            <strong>Semester:</strong> {exam.semester}
                          </p>
                        </div>
                        <div style={{
                          padding: '8px 12px',
                          backgroundColor: exam.timeSlot === 'morning' ? '#e0f2fe' : '#fef3c7',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          color: exam.timeSlot === 'morning' ? '#0369a1' : '#92400e'
                        }}>
                          {exam.timeSlot === 'morning' ? 'Morning' : 'Evening'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={18} color="#64748b" />
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Time</div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>
                              {formatTime(exam.startTime)} - {formatTime(exam.endTime)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={18} color="#64748b" />
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Classroom</div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{exam.className}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={18} color="#64748b" />
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Teacher</div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{exam.teacherName}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentExamDatesheet;

