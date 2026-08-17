// Export utility functions for PDF and Excel
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data, filename = 'export') => {
  // Simple CSV export (can be enhanced with xlsx library)
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTimetableToCSV = (timetable) => {
  const data = timetable.map(entry => ({
    Course: `${entry.courseId?.courseCode || ''} - ${entry.courseId?.courseName || ''}`,
    Teacher: entry.teacherId?.name || '',
    Classroom: entry.classId?.className || '',
    Day: entry.day,
    'Start Time': entry.startTime,
    'End Time': entry.endTime,
    Semester: entry.semester,
    'Academic Year': entry.academicYear
  }));

  exportToExcel(data, 'timetable');
};

export const exportTimetableToPDF = (timetable = []) => {
  if (!timetable.length) {
    alert('No timetable data to export');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Timetable Report', 40, 40);

  const bySemester = {};
  timetable.forEach((entry) => {
    const sem = Number(entry.semester) || 0;
    if (!bySemester[sem]) bySemester[sem] = [];
    bySemester[sem].push(entry);
  });

  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);
  let y = 60;

  semesters.forEach((sem, idx) => {
    if (idx > 0 && y > 470) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(11);
    doc.text(`Semester ${sem}`, 40, y);

    const rows = bySemester[sem]
      .slice()
      .sort((a, b) => {
        const dayCmp = String(a.day || '').localeCompare(String(b.day || ''));
        if (dayCmp !== 0) return dayCmp;
        return String(a.startTime || '').localeCompare(String(b.startTime || ''));
      })
      .map((entry) => [
        entry.courseId?.courseCode || '',
        entry.courseId?.courseName || '',
        entry.teacherId?.name || '',
        entry.classId?.className || '',
        entry.day || '',
        `${entry.startTime || ''}-${entry.endTime || ''}`,
        entry.academicYear || ''
      ]);

    autoTable(doc, {
      startY: y + 8,
      head: [['Course Code', 'Course Name', 'Teacher', 'Classroom', 'Day', 'Time', 'Academic Year']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [11, 60, 93] }
    });

    y = (doc.lastAutoTable?.finalY || y + 8) + 18;
  });

  doc.save(`timetable-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportExamDatesheetToPDF = (datesheet) => {
  const entries = datesheet?.entries || [];
  if (!entries.length) {
    alert('No exam datesheet data to export');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Exam Datesheet Report', 40, 40);
  doc.setFontSize(10);
  doc.text(`Exam ID: ${datesheet?.examId || '-'}`, 40, 58);
  doc.text(`Academic Year: ${datesheet?.academicYear || '-'}`, 240, 58);

  const bySemester = {};
  entries.forEach((entry) => {
    const sem = Number(entry.semester) || 0;
    if (!bySemester[sem]) bySemester[sem] = [];
    bySemester[sem].push(entry);
  });

  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);
  let y = 74;

  semesters.forEach((sem, idx) => {
    if (idx > 0 && y > 470) {
      doc.addPage();
      y = 40;
    }
    doc.setFontSize(11);
    doc.text(`Semester ${sem}`, 40, y);

    const rows = bySemester[sem]
      .slice()
      .sort((a, b) => {
        const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
        const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return String(a.timeSlot || '').localeCompare(String(b.timeSlot || ''));
      })
      .map((entry) => [
        entry.courseCode || '',
        entry.courseName || '',
        entry.teacherName || '',
        entry.className || '',
        entry.examDate ? new Date(entry.examDate).toLocaleDateString() : '',
        entry.timeSlot || '',
        `${entry.startTime || ''}-${entry.endTime || ''}`,
        entry.totalStudents ?? ''
      ]);

    autoTable(doc, {
      startY: y + 8,
      head: [['Course Code', 'Course Name', 'Teacher', 'Classroom', 'Exam Date', 'Slot', 'Time', 'Students']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [11, 60, 93] }
    });

    y = (doc.lastAutoTable?.finalY || y + 8) + 18;
  });

  doc.save(`exam-datesheet-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportRegistrationsToCSV = (registrations) => {
  const data = registrations.map(reg => ({
    'Student Name': reg.studentId?.name || '',
    'Registration No': reg.studentId?.registrationNo || '',
    Email: reg.studentId?.email || '',
    'Course Code': reg.courseId?.courseCode || '',
    'Course Name': reg.courseId?.courseName || '',
    Credits: reg.courseId?.credits || 0,
    'Registration Date': new Date(reg.registrationDate).toLocaleDateString(),
    Status: reg.status
  }));

  exportToExcel(data, 'registrations');
};

export const exportCoursesToCSV = (courses) => {
  const data = courses.map(course => ({
    'Course ID': course.courseId,
    'Course Code': course.courseCode,
    'Course Name': course.courseName,
    Credits: course.credits,
    Semester: course.semester,
    'Degree Levels': course.degreeLevels?.join(', ') || '',
    'Max Students': course.maxStudents,
    'Registered': course.registeredCount || 0,
    'Available Spots': course.availableSpots || 0
  }));

  exportToExcel(data, 'courses');
};




