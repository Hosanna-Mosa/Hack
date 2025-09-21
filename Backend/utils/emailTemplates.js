function renderMonthlyAttendanceTemplate({ schoolName, monthName, summary, classes }) {
  const brand = schoolName || 'School';
  const styles = {
    body: 'margin:0;padding:0;background-color:#f6f7fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;',
    container: 'max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8f0;',
    header: 'background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:20px 24px;color:#ffffff;',
    h1: 'margin:0;font-size:20px;font-weight:600;',
    sub: 'margin:6px 0 0 0;font-size:12px;opacity:.9;',
    content: 'padding:24px;',
    card: 'background:#0ea5e910;border:1px solid #0ea5e933;border-radius:10px;padding:16px;margin-top:12px;',
    table: 'width:100%;border-collapse:separate;border-spacing:0;margin-top:12px;border:1px solid #e6e8f0;border-radius:10px;overflow:hidden;',
    th: 'text-align:left;background:#f1f5f9;padding:12px 14px;font-size:13px;color:#334155;border-bottom:1px solid #e6e8f0;',
    td: 'padding:12px 14px;font-size:14px;color:#0f172a;border-bottom:1px solid #eef2f7;',
    total: 'font-weight:600;color:#0f172a;',
    footer: 'padding:18px 24px;font-size:12px;color:#64748b;background:#f8fafc;border-top:1px solid #e6e8f0;text-align:center;'
  };

  const classesRows = Array.isArray(classes) && classes.length
    ? classes.map((c) => `
      <tr>
        <td style="${styles.td}">${c.name || 'Class'}</td>
        <td style="${styles.td}">${Number(c.present || 0)}</td>
        <td style="${styles.td}">${Number(c.absent || 0)}</td>
        <td style="${styles.td}">${Number(c.late || 0)}</td>
        <td style="${styles.td}">${Number(c.excused || 0)}</td>
        <td style="${styles.td} ${styles.total}">${Number(c.total || 0)}</td>
      </tr>`).join('')
    : '';

  const classesTable = classesRows
    ? `
      <h3 style="margin:18px 0 8px 0;font-size:16px;color:#0f172a;">By Class</h3>
      <table role="presentation" style="${styles.table}">
        <thead>
          <tr>
            <th style="${styles.th}">Class</th>
            <th style="${styles.th}">Present</th>
            <th style="${styles.th}">Absent</th>
            <th style="${styles.th}">Late</th>
            <th style="${styles.th}">Excused</th>
            <th style="${styles.th}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${classesRows}
        </tbody>
      </table>
    `
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Monthly Attendance Summary</title>
  </head>
  <body style="${styles.body}">
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="${styles.h1}">${brand} — Monthly Attendance Summary</h1>
        <p style="${styles.sub}">${monthName}</p>
      </div>
      <div style="${styles.content}">
        <div style="${styles.card}">
          <p style="margin:0;font-size:14px;color:#0f172a;">Here is the attendance summary for <strong>${monthName}</strong>.</p>
        </div>
        <table role="presentation" style="${styles.table}">
          <thead>
            <tr>
              <th style="${styles.th}">Metric</th>
              <th style="${styles.th}">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${styles.td}">Present</td><td style="${styles.td}">${Number(summary.present || 0)}</td></tr>
            <tr><td style="${styles.td}">Absent</td><td style="${styles.td}">${Number(summary.absent || 0)}</td></tr>
            <tr><td style="${styles.td}">Late</td><td style="${styles.td}">${Number(summary.late || 0)}</td></tr>
            <tr><td style="${styles.td}">Excused</td><td style="${styles.td}">${Number(summary.excused || 0)}</td></tr>
            <tr><td style="${styles.td} ${styles.total}">Total</td><td style="${styles.td} ${styles.total}">${Number(summary.total || 0)}</td></tr>
          </tbody>
        </table>
        ${classesTable}
        <p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">This is an automated report. For details, sign in to your dashboard.</p>
      </div>
      <div style="${styles.footer}">
        <span>© ${new Date().getFullYear()} ${brand}. All rights reserved.</span>
      </div>
    </div>
  </body>
</html>`;
}

function renderDailyMidDayMealTemplate({ schoolName, dateStr, summary, classes }) {
  const brand = schoolName || 'School';
  const styles = {
    body: 'margin:0;padding:0;background-color:#f6f7fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#222;',
    container: 'max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8f0;',
    header: 'background:linear-gradient(135deg,#059669,#047857);padding:20px 24px;color:#ffffff;',
    h1: 'margin:0;font-size:20px;font-weight:600;',
    sub: 'margin:6px 0 0 0;font-size:12px;opacity:.9;',
    content: 'padding:24px;',
    card: 'background:#10b98110;border:1px solid #10b98133;border-radius:10px;padding:16px;margin-top:12px;',
    highlight: 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin:12px 0;',
    table: 'width:100%;border-collapse:separate;border-spacing:0;margin-top:12px;border:1px solid #e6e8f0;border-radius:10px;overflow:hidden;',
    th: 'text-align:left;background:#f1f5f9;padding:12px 14px;font-size:13px;color:#334155;border-bottom:1px solid #e6e8f0;',
    td: 'padding:12px 14px;font-size:14px;color:#0f172a;border-bottom:1px solid #eef2f7;',
    total: 'font-weight:600;color:#0f172a;',
    meal: 'font-weight:600;color:#059669;',
    footer: 'padding:18px 24px;font-size:12px;color:#64748b;background:#f8fafc;border-top:1px solid #e6e8f0;text-align:center;'
  };

  const classesRows = Array.isArray(classes) && classes.length
    ? classes.map((c) => {
        const mealEligible = Number(c.present || 0) + Number(c.late || 0);
        return `
          <tr>
            <td style="${styles.td}">${c.name || 'Class'}</td>
            <td style="${styles.td}">${Number(c.present || 0)}</td>
            <td style="${styles.td}">${Number(c.late || 0)}</td>
            <td style="${styles.td} ${styles.meal}">${mealEligible}</td>
            <td style="${styles.td}">${Number(c.absent || 0)}</td>
            <td style="${styles.td}">${Number(c.excused || 0)}</td>
            <td style="${styles.td} ${styles.total}">${Number(c.total || 0)}</td>
          </tr>`;
      }).join('')
    : '';

  const classesTable = classesRows
    ? `
      <h3 style="margin:18px 0 8px 0;font-size:16px;color:#0f172a;">By Class - Mid-Day Meal Eligibility</h3>
      <table role="presentation" style="${styles.table}">
        <thead>
          <tr>
            <th style="${styles.th}">Class</th>
            <th style="${styles.th}">Present</th>
            <th style="${styles.th}">Late</th>
            <th style="${styles.th}">Meal Eligible</th>
            <th style="${styles.th}">Absent</th>
            <th style="${styles.th}">Excused</th>
            <th style="${styles.th}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${classesRows}
        </tbody>
      </table>
    `
    : '';

  const mealEligibleTotal = Number(summary.present || 0) + Number(summary.late || 0);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Daily Mid-Day Meal Report</title>
  </head>
  <body style="${styles.body}">
    <div style="${styles.container}">
      <div style="${styles.header}">
        <h1 style="${styles.h1}">${brand} — Daily Mid-Day Meal Report</h1>
        <p style="${styles.sub}">${dateStr}</p>
      </div>
      <div style="${styles.content}">
        <div style="${styles.card}">
          <p style="margin:0;font-size:14px;color:#0f172a;">Here is the daily mid-day meal report for <strong>${dateStr}</strong>.</p>
        </div>
        
        <div style="${styles.highlight}">
          <h3 style="margin:0 0 8px 0;font-size:16px;color:#92400e;">🍽️ Mid-Day Meal Summary</h3>
          <p style="margin:0;font-size:18px;font-weight:600;color:#059669;">
            Total Students Eligible for Mid-Day Meal: <strong>${mealEligibleTotal}</strong>
          </p>
          <p style="margin:4px 0 0 0;font-size:14px;color:#6b7280;">
            (Present: ${Number(summary.present || 0)} + Late: ${Number(summary.late || 0)})
          </p>
        </div>
        
        <table role="presentation" style="${styles.table}">
          <thead>
            <tr>
              <th style="${styles.th}">Metric</th>
              <th style="${styles.th}">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${styles.td}">Present</td><td style="${styles.td}">${Number(summary.present || 0)}</td></tr>
            <tr><td style="${styles.td}">Late</td><td style="${styles.td}">${Number(summary.late || 0)}</td></tr>
            <tr><td style="${styles.td} ${styles.meal}">Mid-Day Meal Eligible</td><td style="${styles.td} ${styles.meal}">${mealEligibleTotal}</td></tr>
            <tr><td style="${styles.td}">Absent</td><td style="${styles.td}">${Number(summary.absent || 0)}</td></tr>
            <tr><td style="${styles.td}">Excused</td><td style="${styles.td}">${Number(summary.excused || 0)}</td></tr>
            <tr><td style="${styles.td} ${styles.total}">Total</td><td style="${styles.td} ${styles.total}">${Number(summary.total || 0)}</td></tr>
          </tbody>
        </table>
        ${classesTable}
        <p style="margin:16px 0 0 0;font-size:12px;color:#64748b;">This is an automated daily report. For details, sign in to your dashboard.</p>
      </div>
      <div style="${styles.footer}">
        <span>© ${new Date().getFullYear()} ${brand}. All rights reserved.</span>
      </div>
    </div>
  </body>
</html>`;
}

module.exports = { renderMonthlyAttendanceTemplate, renderDailyMidDayMealTemplate };


