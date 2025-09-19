const ExcelJS = require('exceljs');

async function buildMonthlyAttendanceWorkbook({ schoolName = 'School', monthName, summary, classes = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendance System';
  workbook.created = new Date();

  // Summary sheet
  const wsSummary = workbook.addWorksheet('Summary');
  wsSummary.columns = [
    { header: 'Metric', key: 'metric', width: 20 },
    { header: 'Count', key: 'count', width: 15 },
    { header: 'Percent', key: 'percent', width: 12 }
  ];
  const total = Number(summary.total || 0);
  wsSummary.addRow({ metric: 'School', count: schoolName, percent: '' });
  wsSummary.addRow({ metric: 'Month', count: monthName, percent: '' });
  wsSummary.addRow({ metric: 'Total', count: total, percent: total ? 1 : '' });
  wsSummary.addRow({ metric: 'Present', count: Number(summary.present || 0), percent: total ? Number(summary.present || 0) / total : 0 });
  wsSummary.addRow({ metric: 'Absent', count: Number(summary.absent || 0), percent: total ? Number(summary.absent || 0) / total : 0 });
  wsSummary.addRow({ metric: 'Late', count: Number(summary.late || 0), percent: total ? Number(summary.late || 0) / total : 0 });
  wsSummary.addRow({ metric: 'Excused', count: Number(summary.excused || 0), percent: total ? Number(summary.excused || 0) / total : 0 });
  // Format percent column
  for (let r = 1; r <= wsSummary.rowCount; r++) {
    const cell = wsSummary.getCell(`C${r}`);
    if (typeof cell.value === 'number') cell.numFmt = '0.00%';
  }
  wsSummary.getRow(1).font = { bold: true };

  // Classes sheet
  const wsClasses = workbook.addWorksheet('By Class');
  wsClasses.columns = [
    { header: 'Class', key: 'class', width: 24 },
    { header: 'Present', key: 'present', width: 10 },
    { header: 'Present %', key: 'presentPct', width: 10 },
    { header: 'Absent', key: 'absent', width: 10 },
    { header: 'Absent %', key: 'absentPct', width: 10 },
    { header: 'Late', key: 'late', width: 10 },
    { header: 'Late %', key: 'latePct', width: 10 },
    { header: 'Excused', key: 'excused', width: 10 },
    { header: 'Excused %', key: 'excusedPct', width: 10 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Attendance Rate', key: 'attendanceRate', width: 16 }
  ];
  for (const c of classes) {
    const tot = Number(c.total || 0);
    const present = Number(c.present || 0);
    const absent = Number(c.absent || 0);
    const late = Number(c.late || 0);
    const excused = Number(c.excused || 0);
    const presentPct = tot ? present / tot : 0;
    const absentPct = tot ? absent / tot : 0;
    const latePct = tot ? late / tot : 0;
    const excusedPct = tot ? excused / tot : 0;
    const attendanceRate = tot ? present / tot : 0;
    wsClasses.addRow({
      class: c.name || 'Class',
      present,
      presentPct,
      absent,
      absentPct,
      late,
      latePct,
      excused,
      excusedPct,
      total: tot,
      attendanceRate
    });
  }
  // Format percent columns
  if (wsClasses.rowCount > 1) {
    for (let r = 2; r <= wsClasses.rowCount; r++) {
      ['C', 'E', 'G', 'I', 'K'].forEach((col) => {
        const cell = wsClasses.getCell(`${col}${r}`);
        if (typeof cell.value === 'number') cell.numFmt = '0.00%';
      });
    }
  }
  wsClasses.getRow(1).font = { bold: true };

  // One sheet per class with student-level breakdown
  for (const c of classes) {
    const sheetName = (c.name || 'Class').toString().substring(0, 28); // Excel sheet name limit
    const ws = workbook.addWorksheet(sheetName);
    ws.columns = [
      { header: 'Student Code', key: 'code', width: 18 },
      { header: 'Student', key: 'student', width: 28 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Present %', key: 'presentPct', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Absent %', key: 'absentPct', width: 10 },
      { header: 'Late', key: 'late', width: 10 },
      { header: 'Late %', key: 'latePct', width: 10 },
      { header: 'Excused', key: 'excused', width: 10 },
      { header: 'Excused %', key: 'excusedPct', width: 10 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Attendance Rate', key: 'attendanceRate', width: 16 }
    ];
    const students = Array.isArray(c.students) ? c.students : [];
    for (const s of students) {
      const tot = Number(s.total || 0);
      const present = Number(s.present || 0);
      const absent = Number(s.absent || 0);
      const late = Number(s.late || 0);
      const excused = Number(s.excused || 0);
      const row = {
        code: s.code || '',
        student: s.name || 'Student',
        present,
        presentPct: tot ? present / tot : 0,
        absent,
        absentPct: tot ? absent / tot : 0,
        late,
        latePct: tot ? late / tot : 0,
        excused,
        excusedPct: tot ? excused / tot : 0,
        total: tot,
        attendanceRate: tot ? present / tot : 0
      };
      ws.addRow(row);
    }
    ws.getRow(1).font = { bold: true };
    if (ws.rowCount > 1) {
      for (let r = 2; r <= ws.rowCount; r++) {
        ['C', 'E', 'G', 'I', 'K'].forEach((col) => {
          const cell = ws.getCell(`${col}${r}`);
          if (typeof cell.value === 'number') cell.numFmt = '0.00%';
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = { buildMonthlyAttendanceWorkbook };


