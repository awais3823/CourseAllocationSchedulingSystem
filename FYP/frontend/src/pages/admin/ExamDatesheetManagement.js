import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import ExamDatesheetGrid from '../../components/ExamDatesheetGrid';
import { exportExamDatesheetToPDF } from '../../utils/exportUtils';
import './AdminPages.css';
import { Upload, AlertTriangle, FileText, Database } from 'lucide-react';

const ExamDatesheetManagement = () => {
  const [datesheets, setDatesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    file: null
  });
  const [generateMode, setGenerateMode] = useState('excel');
  const [systemForm, setSystemForm] = useState({
    semester: '',
    program: '',
    degreeLevel: '',
    academicYear: ''
  });

  const [showStructure, setShowStructure] = useState(false);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [movingEntryIndex, setMovingEntryIndex] = useState(null);
  const [showExamEntryUpdateForm, setShowExamEntryUpdateForm] = useState(false);
  const [examEntryForm, setExamEntryForm] = useState({
    entryIndex: null,
    courseCode: '',
    courseName: '',
    teacherName: '',
    className: '',
    semester: '',
    program: '',
    degreeLevel: '',
    examDate: '',
    timeSlot: 'morning',
    classroomCapacity: ''
  });
  const [savingExamEntry, setSavingExamEntry] = useState(false);
  const [showExamEntryAddForm, setShowExamEntryAddForm] = useState(false);

  useEffect(() => {
    loadDatesheets();
  }, []);

  /** Only one exam datesheet is supported; use the most recently created if the API returns more than one. */
  const activeDatesheet = useMemo(() => {
    if (datesheets.length === 0) return null;
    return [...datesheets].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )[0];
  }, [datesheets]);

  const handleDelete = async () => {
    if (!activeDatesheet) return;
    const id = activeDatesheet._id;
    if (!window.confirm('Are you sure you want to delete this exam datesheet? This action cannot be undone.')) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await api.delete(`/exam-datesheets/${id}`);
      setSuccess('Exam datesheet deleted successfully.');
      loadDatesheets();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exam datesheet');
    }
  };

  const loadDatesheets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/exam-datesheets');
      if (response.data.success) {
        setDatesheets(response.data.datesheets || []);
      }
    } catch (error) {
      setError('Failed to load exam datesheets');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const resetGenerateForm = () => {
    setFormData({ startDate: '', endDate: '', file: null });
    setSystemForm({ semester: '', program: '', degreeLevel: '', academicYear: '' });
    setGenerateMode('excel');
  };

  const handleGenerateExcel = async () => {
    if (!formData.file) {
      setError('Please upload an Excel file');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      formDataToSend.append('startDate', formData.startDate);
      formDataToSend.append('endDate', formData.endDate);

      const response = await api.post('/exam-datesheets/generate-from-excel', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess(`Exam datesheet generated from Excel! ${response.data.datesheet.entries?.length || 0} exams scheduled.`);
        setShowGenerateForm(false);
        resetGenerateForm();
        loadDatesheets();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate exam datesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSystem = async () => {
    if (!formData.startDate || !formData.endDate) {
      setError('Please set exam start and end dates');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const body = {
        startDate: formData.startDate,
        endDate: formData.endDate
      };
      if (systemForm.academicYear.trim()) body.academicYear = systemForm.academicYear.trim();
      if (systemForm.semester !== '' && systemForm.semester != null) {
        const s = parseInt(systemForm.semester, 10);
        if (!Number.isNaN(s)) body.semester = s;
      }
      if (systemForm.program.trim()) body.program = systemForm.program.trim();
      if (systemForm.degreeLevel.trim()) body.degreeLevel = systemForm.degreeLevel.trim();

      const response = await api.post('/exam-datesheets/generate-from-system', body);

      if (response.data.success) {
        const n = response.data.datesheet.entries?.length || 0;
        setSuccess(
          `Exam datesheet generated from database! ${n} exam slot(s) scheduled (${response.data.meta?.coursesScheduled || n} course(s)).`
        );
        setShowGenerateForm(false);
        resetGenerateForm();
        loadDatesheets();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate datesheet from system data');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (generateMode === 'excel') {
      await handleGenerateExcel();
    } else {
      await handleGenerateSystem();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const handleDragStartEntry = (entry) => {
    setDraggedEntry(entry);
    setDropTarget(null);
    setError('');
    setSuccess('');
  };

  const handleDragEndEntry = () => {
    setDraggedEntry(null);
    setDropTarget(null);
  };

  const handleDropToCell = async (dateKey, timeSlot) => {
    if (!activeDatesheet || !draggedEntry) return;

    const sameSlot =
      draggedEntry.timeSlot === timeSlot &&
      (draggedEntry.examDate ? new Date(draggedEntry.examDate).toISOString().slice(0, 10) : '') === dateKey;
    if (sameSlot) {
      setDraggedEntry(null);
      setDropTarget(null);
      return;
    }

    try {
      setMovingEntryIndex(draggedEntry._entryIndex);
      setError('');
      setSuccess('');
      const res = await api.put(`/exam-datesheets/${activeDatesheet._id}/move-entry`, {
        entryIndex: draggedEntry._entryIndex,
        targetDate: dateKey,
        timeSlot
      });
      if (res.data.success) {
        setDatesheets((prev) =>
          prev.map((d) => (d._id === res.data.datesheet._id ? res.data.datesheet : d))
        );
        setSuccess('Exam moved successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move exam entry');
    } finally {
      setMovingEntryIndex(null);
      setDraggedEntry(null);
      setDropTarget(null);
    }
  };

  const mergeUpdatedDatesheet = (updated) => {
    if (!updated) return;
    setDatesheets((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
  };

  const openExamEntryUpdateForm = (entry) => {
    const d = entry.examDate ? new Date(entry.examDate).toISOString().slice(0, 10) : '';
    setExamEntryForm({
      entryIndex: entry._entryIndex,
      courseCode: entry.courseCode || '',
      courseName: entry.courseName || '',
      teacherName: entry.teacherName || '',
      className: entry.className || '',
      semester: entry.semester ?? '',
      program: entry.program || '',
      degreeLevel: entry.degreeLevel || '',
      examDate: d,
      timeSlot: entry.timeSlot === 'evening' ? 'evening' : 'morning',
      classroomCapacity: entry.classroomCapacity != null ? String(entry.classroomCapacity) : ''
    });
    setShowExamEntryUpdateForm(true);
    setShowExamEntryAddForm(false);
    setError('');
  };

  const closeExamEntryForms = () => {
    setShowExamEntryUpdateForm(false);
    setShowExamEntryAddForm(false);
  };

  const openExamEntryAddForm = () => {
    if (!activeDatesheet) return;
    const periodStart = activeDatesheet.examPeriod?.startDate;
    const examDateDefault = periodStart
      ? new Date(periodStart).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    setExamEntryForm({
      entryIndex: null,
      courseCode: '',
      courseName: '',
      teacherName: '',
      className: '',
      semester: '',
      program: '',
      degreeLevel: '',
      examDate: examDateDefault,
      timeSlot: 'morning',
      classroomCapacity: ''
    });
    setShowExamEntryAddForm(true);
    setShowExamEntryUpdateForm(false);
    setError('');
  };

  const handleExamEntryUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!activeDatesheet || examEntryForm.entryIndex == null) return;
    try {
      setSavingExamEntry(true);
      setError('');
      setSuccess('');
      const payload = {
        entryIndex: examEntryForm.entryIndex,
        courseCode: examEntryForm.courseCode,
        courseName: examEntryForm.courseName,
        teacherName: examEntryForm.teacherName,
        className: examEntryForm.className,
        program: examEntryForm.program || undefined,
        degreeLevel: examEntryForm.degreeLevel || undefined,
        examDate: examEntryForm.examDate,
        timeSlot: examEntryForm.timeSlot
      };
      if (examEntryForm.semester !== '' && examEntryForm.semester != null) {
        const s = parseInt(String(examEntryForm.semester), 10);
        if (!Number.isNaN(s)) payload.semester = s;
      }
      if (examEntryForm.classroomCapacity !== '' && examEntryForm.classroomCapacity != null) {
        const c = parseInt(String(examEntryForm.classroomCapacity), 10);
        if (!Number.isNaN(c)) payload.classroomCapacity = c;
      }

      const res = await api.put(`/exam-datesheets/${activeDatesheet._id}/entry`, payload);
      if (res.data.success) {
        mergeUpdatedDatesheet(res.data.datesheet);
        setSuccess('Exam entry updated successfully.');
        closeExamEntryForms();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam entry');
    } finally {
      setSavingExamEntry(false);
    }
  };

  const handleExamEntryAddSubmit = async (e) => {
    e.preventDefault();
    if (!activeDatesheet) return;
    try {
      setSavingExamEntry(true);
      setError('');
      setSuccess('');
      const payload = {
        courseCode: examEntryForm.courseCode,
        courseName: examEntryForm.courseName,
        teacherName: examEntryForm.teacherName,
        className: examEntryForm.className,
        program: examEntryForm.program || undefined,
        degreeLevel: examEntryForm.degreeLevel || undefined,
        examDate: examEntryForm.examDate,
        timeSlot: examEntryForm.timeSlot
      };
      if (examEntryForm.semester !== '' && examEntryForm.semester != null) {
        const s = parseInt(String(examEntryForm.semester), 10);
        if (!Number.isNaN(s)) payload.semester = s;
      }
      if (examEntryForm.classroomCapacity !== '' && examEntryForm.classroomCapacity != null) {
        const c = parseInt(String(examEntryForm.classroomCapacity), 10);
        if (!Number.isNaN(c)) payload.classroomCapacity = c;
      }

      const res = await api.post(`/exam-datesheets/${activeDatesheet._id}/entry`, payload);
      if (res.data.success) {
        mergeUpdatedDatesheet(res.data.datesheet);
        setSuccess('Exam entry added successfully.');
        closeExamEntryForms();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add exam entry');
    } finally {
      setSavingExamEntry(false);
    }
  };

  const handleExamEntryDelete = async (entry) => {
    if (!activeDatesheet || entry._entryIndex == null) return;
    if (!window.confirm('Remove this exam from the datesheet?')) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/exam-datesheets/${activeDatesheet._id}/entry/${entry._entryIndex}`);
      if (res.data.success) {
        mergeUpdatedDatesheet(res.data.datesheet);
        setSuccess('Exam entry removed.');
        if (showExamEntryUpdateForm && examEntryForm.entryIndex === entry._entryIndex) {
          closeExamEntryForms();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove exam entry');
    }
  };

  if (loading && datesheets.length === 0) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Exam Datesheet Management</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowGenerateForm(true)}
            className="btn btn-primary"
          >
            Generate Datesheet
          </button>
          {activeDatesheet && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openExamEntryAddForm}
            >
              Add Entry
            </button>
          )}
          {activeDatesheet && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => exportExamDatesheetToPDF(activeDatesheet)}
            >
              <FileText size={18} />
              Download PDF
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowStructure(!showStructure)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={18} />
            {showStructure ? 'Hide Excel structure' : 'Show Excel structure'}
          </button>
          {activeDatesheet && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDelete}
              title="Delete current exam datesheet"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Excel structure guide - on top when admin toggles it */}
      {showStructure && (
        <div className="card" style={{ marginBottom: '25px', backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9' }}>
          <h2 style={{ marginTop: '0', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} /> Excel Upload Structure
          </h2>
          <div style={{ background: '#ffffff', padding: '15px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.8', overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px', backgroundColor: '#f8fafc', fontWeight: 'bold', borderBottom: '2px solid #bae6fd' }}>
                <span>Student Registration No</span>
                <span>Student Name</span>
                <span>Course Code</span>
                <span>Course Name</span>
                <span>Semester</span>
                <span>Teacher Name</span>
                <span>Program</span>
                <span>Degree Level</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px' }}>
                <span>STU001</span>
                <span>John Doe</span>
                <span>CS101</span>
                <span>Introduction to CS</span>
                <span>1</span>
                <span>Dr. Smith</span>
                <span>Computer Science</span>
                <span>BS</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px', backgroundColor: '#f8fafc' }}>
                <span>STU001</span>
                <span>John Doe</span>
                <span>CS201</span>
                <span>Data Structures</span>
                <span>2</span>
                <span>Dr. Johnson</span>
                <span>Computer Science</span>
                <span>BS</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px' }}>
                <span>STU001</span>
                <span>John Doe</span>
                <span>MATH101</span>
                <span>Calculus I</span>
                <span>1</span>
                <span>Dr. Brown</span>
                <span>Mathematics</span>
                <span>BS</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px', backgroundColor: '#f8fafc' }}>
                <span>STU002</span>
                <span>Jane Smith</span>
                <span>CS101</span>
                <span>Introduction to CS</span>
                <span>1</span>
                <span>Dr. Smith</span>
                <span>Computer Science</span>
                <span>BS</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 150px 100px 200px 80px 150px 150px 100px', gap: '10px', padding: '8px' }}>
                <span>STU002</span>
                <span>Jane Smith</span>
                <span>CS301</span>
                <span>Algorithms</span>
                <span>3</span>
                <span>Dr. Johnson</span>
                <span>Computer Science</span>
                <span>BS</span>
              </div>
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
              Note: Student STU001 has 3 courses (CS101 Sem 1, CS201 Sem 2, MATH101 Sem 1) - each course is a separate row.
            </p>
          </div>
        </div>
      )}

      {/* Full Exam Datesheet - Primary View for Admin */}
      {activeDatesheet && (
        <div className="card" style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>Full Exam Datesheet — {activeDatesheet.examId || activeDatesheet._id}</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong>Source:</strong>{' '}
                {activeDatesheet.generatedFrom === 'system' ? 'Database' : 'Excel'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong>Academic Year:</strong> {activeDatesheet.academicYear}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong>Period:</strong> {formatDate(activeDatesheet.examPeriod?.startDate)} – {formatDate(activeDatesheet.examPeriod?.endDate)}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong>Total:</strong> {activeDatesheet.entries?.length || 0} exams
              </span>
            </div>
          </div>

          {activeDatesheet.conflicts && activeDatesheet.conflicts.length > 0 && (() => {
            const scheduleClashes = activeDatesheet.conflicts.filter((c) => c.isScheduleClash);
            if (scheduleClashes.length === 0) return null;
            return (
              <div style={{ marginBottom: '20px' }}>
                <div className="alert alert-warning">
                  <strong><AlertTriangle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Student same-slot clashes:</strong>
                  <ul style={{ marginTop: '10px', marginBottom: 0 }}>
                    {scheduleClashes.map((conflict, idx) => (
                      <li key={idx}>{conflict.message || conflict.description} ({conflict.type})</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}

          <p style={{ marginBottom: '10px', color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
            Drag an exam card and drop it on another day/session cell to move it.
          </p>
          <ExamDatesheetGrid
            entries={activeDatesheet.entries}
            editable
            movingEntryIndex={movingEntryIndex}
            dropTarget={dropTarget}
            onDragOverCell={(dateKey, timeSlot) => setDropTarget({ dateKey, timeSlot })}
            onDragStartEntry={handleDragStartEntry}
            onDragEndEntry={handleDragEndEntry}
            onDropToCell={handleDropToCell}
            onUpdateEntry={openExamEntryUpdateForm}
            onDeleteEntry={handleExamEntryDelete}
          />
        </div>
      )}

      {!loading && datesheets.length === 0 && (
        <p className="no-data">No exam datesheets found. Generate one to get started.</p>
      )}

      {(showExamEntryUpdateForm || showExamEntryAddForm) && (
        <div
          className="gen-modal-overlay"
          onClick={() => !savingExamEntry && closeExamEntryForms()}
        >
          <div
            className="gen-modal"
            style={{ width: 'min(680px, 96vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gen-modal__header">
              <h2>{showExamEntryAddForm ? 'Add Exam Entry' : 'Update Exam Entry'}</h2>
              <button
                type="button"
                className="gen-modal__close"
                onClick={() => !savingExamEntry && closeExamEntryForms()}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={showExamEntryAddForm ? handleExamEntryAddSubmit : handleExamEntryUpdateSubmit}
            >
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
                {showExamEntryAddForm ? (
                  <>
                    New exams start with no student roster on this row (counts as 0 students). Scheduling
                    rules (teacher, venue, weekdays, morning/evening slots) still apply—the same as for
                    generated entries.
                  </>
                ) : (
                  <>
                    Changing date or session uses weekday rules and fixed morning / evening slots (same as
                    drag-and-drop).
                  </>
                )}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Course code</label>
                  <input
                    type="text"
                    value={examEntryForm.courseCode}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, courseCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Course name</label>
                  <input
                    type="text"
                    value={examEntryForm.courseName}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, courseName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Teacher name</label>
                  <input
                    type="text"
                    value={examEntryForm.teacherName}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, teacherName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Classroom / venue</label>
                  <input
                    type="text"
                    value={examEntryForm.className}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, className: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={examEntryForm.semester}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, semester: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Classroom capacity (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={examEntryForm.classroomCapacity}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, classroomCapacity: e.target.value })}
                    placeholder="e.g. 40"
                  />
                </div>
                <div className="form-group">
                  <label>Program</label>
                  <input
                    type="text"
                    value={examEntryForm.program}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, program: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Degree level</label>
                  <select
                    value={examEntryForm.degreeLevel}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, degreeLevel: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="BS">BS</option>
                    <option value="Master">Master</option>
                    <option value="MPhil">MPhil</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Exam date</label>
                  <input
                    type="date"
                    value={examEntryForm.examDate}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, examDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Session</label>
                  <select
                    value={examEntryForm.timeSlot}
                    onChange={(e) =>
                      setExamEntryForm({ ...examEntryForm, timeSlot: e.target.value })}
                    required
                  >
                    <option value="morning">Morning (9:15–12:15)</option>
                    <option value="evening">Evening (12:45–15:45)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingExamEntry}>
                  {savingExamEntry
                    ? 'Saving…'
                    : showExamEntryAddForm
                      ? 'Add entry'
                      : 'Update entry'}
                </button>
                <button
                  type="button"
                  onClick={() => !savingExamEntry && closeExamEntryForms()}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateForm && (
        <div className="gen-modal-overlay" onClick={() => { resetGenerateForm(); setShowGenerateForm(false); }}>
          <div className="gen-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gen-modal__header">
              <h2>Generate Exam Datesheet</h2>
              <button className="gen-modal__close" onClick={() => { resetGenerateForm(); setShowGenerateForm(false); }}>✕</button>
            </div>
          <div
            role="tablist"
            style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGenerateMode('excel')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: generateMode === 'excel' ? 1 : 0.72,
                boxShadow:
                  generateMode === 'excel' ? '0 0 0 2px rgba(255, 255, 255, 0.9)' : 'none',
              }}
            >
              <Upload size={18} />
              From Excel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGenerateMode('system')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: generateMode === 'system' ? 1 : 0.72,
                boxShadow:
                  generateMode === 'system' ? '0 0 0 2px rgba(255, 255, 255, 0.9)' : 'none',
              }}
            >
              <Database size={18} />
              From database
            </button>
          </div>
          <form onSubmit={handleFormSubmit}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
              Exams are scheduled on weekdays only (Monday–Friday). Saturday and Sunday are excluded.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Exam Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Exam End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {generateMode === 'excel' && (
              <div className="form-group">
                <label>Upload Excel File</label>
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-block', width: 'auto' }}>
                  <Upload size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  {formData.file ? formData.file.name : 'Choose Excel File'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
                {formData.file && (
                  <p style={{ marginTop: '8px', color: '#10b981', fontSize: '0.875rem' }}>
                    ✓ File selected: {formData.file.name}
                  </p>
                )}
              </div>
            )}

            {generateMode === 'system' && (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.9rem' }}>
                  Uses all students with <strong>registered</strong> course enrollments, grouped by course. Teacher names come from
                  active <strong>allocations</strong> (allocated). Leave filters empty to include everyone.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label>Academic year (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025-2026"
                      value={systemForm.academicYear}
                      onChange={(e) => setSystemForm({ ...systemForm, academicYear: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Course semester (optional)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      placeholder="Any"
                      value={systemForm.semester}
                      onChange={(e) => setSystemForm({ ...systemForm, semester: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Program (optional)</label>
                    <input
                      type="text"
                      placeholder="Exact match to course or student program"
                      value={systemForm.program}
                      onChange={(e) => setSystemForm({ ...systemForm, program: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Degree level (optional)</label>
                    <select
                      value={systemForm.degreeLevel}
                      onChange={(e) => setSystemForm({ ...systemForm, degreeLevel: e.target.value })}
                    >
                      <option value="">Any</option>
                      <option value="BS">BS</option>
                      <option value="Master">Master</option>
                      <option value="MPhil">MPhil</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Generating...' : generateMode === 'excel' ? 'Generate from Excel' : 'Generate from database'}
            </button>
          </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamDatesheetManagement;

