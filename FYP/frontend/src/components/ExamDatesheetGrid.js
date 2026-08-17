import React from 'react';

const formatDayDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dayName} ${dd}/${mm}/${yy}`;
};

const formatTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const fmt = (t) => {
    const [h, m] = (t || '').split(':');
    const hour = parseInt(h, 10);
    return `${hour}:${m || '00'}`;
  };
  return `${fmt(startTime)}-${fmt(endTime)}`;
};

const isStandardSlot = (slot, startTime, endTime) => {
  const standard = slot === 'morning' ? { start: '09:15', end: '12:15' } : { start: '12:45', end: '15:45' };
  return startTime === standard.start && endTime === standard.end;
};

const buildDatesheetGrid = (entries) => {
  const byDate = {};
  (entries || []).forEach((entry, entryIndex) => {
    const dateKey = entry.examDate ? new Date(entry.examDate).toISOString().slice(0, 10) : null;
    if (!dateKey) return;
    if (!byDate[dateKey]) byDate[dateKey] = { morning: [], evening: [] };
    const slot = entry.timeSlot === 'morning' ? 'morning' : 'evening';
    byDate[dateKey][slot].push({ ...entry, _entryIndex: entryIndex });
  });

  const sortedDates = Object.keys(byDate).sort();
  return sortedDates.map(dateKey => ({
    dateKey,
    dayDate: formatDayDate(dateKey),
    morning: byDate[dateKey].morning,
    evening: byDate[dateKey].evening
  }));
};

const ExamDatesheetEntryCard = ({
  entry,
  editable,
  onDragStartEntry,
  onDragEndEntry,
  movingEntryIndex,
  onUpdateEntry,
  onDeleteEntry
}) => {
  const courseName = entry.courseName || 'N/A';
  const truncatedName = courseName.length > 12 ? courseName.substring(0, 12) + '...' : courseName;
  const timeDisplay = isStandardSlot(entry.timeSlot, entry.startTime, entry.endTime)
    ? formatTimeRange(entry.startTime, entry.endTime)
    : `${entry.startTime || ''}-${entry.endTime || ''}`;

  const showActions = !!(editable && onUpdateEntry && onDeleteEntry);

  return (
    <div
      className="timetable-entry"
      draggable={!!editable}
      onDragStart={() => editable && onDragStartEntry && onDragStartEntry(entry)}
      onDragEnd={() => editable && onDragEndEntry && onDragEndEntry()}
      title={`${entry.courseCode || 'N/A'} - ${entry.courseName || 'N/A'} | ${entry.teacherName || 'N/A'} | ${entry.className || 'N/A'}`}
      style={{
        marginBottom: '4px',
        cursor: editable ? 'grab' : 'default',
        opacity: movingEntryIndex === entry._entryIndex ? 0.6 : 1
      }}
    >
      <div className="timetable-entry-header" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <strong className="course-code" style={{ flex: 1 }}>{entry.courseCode || 'N/A'}</strong>
      </div>
      <div className="timetable-entry-time" style={{ fontSize: '0.6rem', marginBottom: '3px' }}>
        {timeDisplay}
      </div>
      <div className="timetable-entry-title" style={{ fontSize: '0.65rem', marginBottom: '3px', fontWeight: '500' }}>
        {truncatedName}
      </div>
      <div className="timetable-entry-instructor" style={{ fontSize: '0.6rem', color: '#555', fontWeight: '500', marginTop: '4px', marginBottom: '2px' }}>
        {entry.teacherName || 'N/A'}
      </div>
      <div style={{ fontSize: '0.55rem', color: '#888', marginTop: '2px' }}>
        {entry.className || 'N/A'} | S{entry.semester || 'N/A'}
      </div>
      {showActions && (
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
              onUpdateEntry(entry);
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
            onMouseEnter={(e) => {
              e.target.style.background = '#082a3f';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#0d4d73';
            }}
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
              onDeleteEntry(entry);
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
            onMouseEnter={(e) => {
              e.target.style.background = '#545b62';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#6c757d';
            }}
            title="Remove entry"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

const ExamDatesheetGrid = ({
  entries,
  editable = false,
  movingEntryIndex = null,
  dropTarget = null,
  onDragOverCell,
  onDragStartEntry,
  onDragEndEntry,
  onDropToCell,
  onUpdateEntry,
  onDeleteEntry
}) => {
  const rows = buildDatesheetGrid(entries || []);

  return (
    <div className="timetable-container exam-datesheet-grid">
      <table className="timetable-table">
        <thead>
          <tr>
            <th className="day-cell">Day</th>
            <th className="time-header">Morning 9:15 TO 12:15</th>
            <th className="time-header">Evening 12:45 TO 15:45</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                No exam entries in this datesheet.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.dateKey}>
                <td className="day-cell">{row.dayDate}</td>
                <td
                  className={row.morning.length > 0 ? 'timetable-cell filled' : 'timetable-cell'}
                  onDragOver={(e) => {
                    if (!editable) return;
                    e.preventDefault();
                    if (onDragOverCell) onDragOverCell(row.dateKey, 'morning');
                  }}
                  onDrop={(e) => {
                    if (!editable || !onDropToCell) return;
                    e.preventDefault();
                    onDropToCell(row.dateKey, 'morning');
                  }}
                  style={
                    dropTarget && dropTarget.dateKey === row.dateKey && dropTarget.timeSlot === 'morning'
                      ? { outline: '2px dashed #3b82f6', outlineOffset: '-3px', background: '#eff6ff' }
                      : undefined
                  }
                >
                  {row.morning.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {row.morning.map((entry, i) => (
                        <ExamDatesheetEntryCard
                          key={`${row.dateKey}-m-${i}`}
                          entry={entry}
                          editable={editable}
                          onDragStartEntry={onDragStartEntry}
                          onDragEndEntry={onDragEndEntry}
                          movingEntryIndex={movingEntryIndex}
                          onUpdateEntry={onUpdateEntry}
                          onDeleteEntry={onDeleteEntry}
                        />
                      ))}
                    </div>
                  )}
                </td>
                <td
                  className={row.evening.length > 0 ? 'timetable-cell filled' : 'timetable-cell'}
                  onDragOver={(e) => {
                    if (!editable) return;
                    e.preventDefault();
                    if (onDragOverCell) onDragOverCell(row.dateKey, 'evening');
                  }}
                  onDrop={(e) => {
                    if (!editable || !onDropToCell) return;
                    e.preventDefault();
                    onDropToCell(row.dateKey, 'evening');
                  }}
                  style={
                    dropTarget && dropTarget.dateKey === row.dateKey && dropTarget.timeSlot === 'evening'
                      ? { outline: '2px dashed #3b82f6', outlineOffset: '-3px', background: '#eff6ff' }
                      : undefined
                  }
                >
                  {row.evening.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {row.evening.map((entry, i) => (
                        <ExamDatesheetEntryCard
                          key={`${row.dateKey}-e-${i}`}
                          entry={entry}
                          editable={editable}
                          onDragStartEntry={onDragStartEntry}
                          onDragEndEntry={onDragEndEntry}
                          movingEntryIndex={movingEntryIndex}
                          onUpdateEntry={onUpdateEntry}
                          onDeleteEntry={onDeleteEntry}
                        />
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ExamDatesheetGrid;
