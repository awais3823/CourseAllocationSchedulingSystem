// Export utility functions for PDF and Excel

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




