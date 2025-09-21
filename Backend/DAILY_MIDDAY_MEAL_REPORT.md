# Daily Mid-Day Meal Report

This feature automatically sends a daily mid-day meal report to school administrators every day at 10:00 AM. The report includes attendance data for all classes and identifies which students are eligible for mid-day meals.

## Features

- **Daily Automation**: Runs automatically every day at 10:00 AM
- **Excel Report**: Generates detailed Excel files with multiple sheets
- **Email Delivery**: Sends reports to all school administrators
- **Class-wise Breakdown**: Shows data for each class separately
- **Student-level Details**: Individual student attendance and meal eligibility
- **Mid-Day Meal Logic**: Students who are "Present" or "Late" are eligible for mid-day meals

## How It Works

### Eligibility Criteria
Students are eligible for mid-day meals if they have:
- Status: "Present" 
- Status: "Late"

Students are NOT eligible if they have:
- Status: "Absent"
- Status: "Excused"

### Report Contents

#### Email Summary
- Total students eligible for mid-day meals
- Breakdown by attendance status (Present, Late, Absent, Excused)
- Class-wise summary

#### Excel File Structure
1. **Summary Sheet**: Overall statistics and percentages
2. **By Class Sheet**: Class-wise breakdown with meal eligibility
3. **Individual Class Sheets**: Student-level details for each class

### Cron Schedule
- **Time**: Every day at 10:00 AM server time
- **Cron Expression**: `0 10 * * *`
- **Timezone**: Server timezone

## Files Created/Modified

### New Files
- `Backend/jobs/dailyMidDayMealEmail.js` - Main cron job logic
- `Backend/scripts/send-daily-midday-meal.js` - Manual testing script
- `Backend/DAILY_MIDDAY_MEAL_REPORT.md` - This documentation

### Modified Files
- `Backend/utils/emailTemplates.js` - Added daily mid-day meal email template
- `Backend/utils/xlsx.js` - Added Excel workbook generation for daily reports
- `Backend/server.js` - Registered the daily cron job
- `Backend/package.json` - Added script command for manual testing

## Usage

### Automatic Operation
The system runs automatically once the backend is started. No manual intervention required.

### Manual Testing
To test the functionality manually:

```bash
# Navigate to backend directory
cd Backend

# Run the manual test script (requires admin ID)
npm run send:daily:midday:admin <adminId>

# Example:
npm run send:daily:midday:admin 507f1f77bcf86cd799439011
```

### Email Template
The email includes:
- School branding and date
- Highlighted mid-day meal eligibility count
- Summary table with all attendance metrics
- Class-wise breakdown table
- Professional styling with green theme for meal-related content

### Excel Report
The Excel file includes:
- **Summary Sheet**: School info, date, totals, and percentages
- **By Class Sheet**: Each class with present/late/meal eligible counts and percentages
- **Individual Class Sheets**: Student-level details for each class

## Configuration

### Email Recipients
The system automatically finds admin emails from:
1. School admin users (from `school.adminIds`)
2. School contact emails (from `school.contactInfo.email`)

### File Naming
- Email attachment: `MidDayMeal-{SchoolName}-{Date}.xlsx`
- Date format: `Monday-December-23-2024` (sanitized for filename)

## Monitoring

### Logs
- Success: "Daily mid-day meal email sent"
- Errors: "Failed to send daily mid-day meal email: {error message}"

### Error Handling
- Database connection issues
- Email sending failures
- Missing admin emails
- No attendance data for the day

## Integration

This feature integrates seamlessly with the existing attendance system:
- Uses the same `AttendanceRecord` model
- Follows the same email infrastructure
- Maintains the same Excel generation patterns
- Uses the same admin notification system

## Troubleshooting

### Common Issues
1. **No emails sent**: Check if there are admin users with valid email addresses
2. **Empty reports**: Verify attendance data exists for the current day
3. **Cron not running**: Check server logs for job registration errors
4. **Email delivery issues**: Verify SMTP configuration in environment variables

### Testing
Use the manual script to test without waiting for the cron schedule:
```bash
npm run send:daily:midday:admin <adminId>
```

## Future Enhancements

Potential improvements:
- Configurable report time (not just 10:00 AM)
- Different meal eligibility rules per school
- SMS notifications in addition to email
- Web dashboard for viewing reports
- Historical report access
