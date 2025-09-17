# Teacher Password Management Scripts

This directory contains scripts to manage teacher passwords in the school attendance system.

## Files

- `add-teacher-passwords.js` - Quick migration script to add passwords to teachers without them
- `teacher-password-manager.js` - Interactive password management tool
- `run-password-migration.sh` - Shell script to easily run the migration tools

## Quick Start

### Option 1: Using the shell script (Recommended)
```bash
cd Backend
./scripts/run-password-migration.sh
```

### Option 2: Direct execution
```bash
cd Backend

# Quick migration (adds passwords to teachers without them)
node scripts/add-teacher-passwords.js

# Interactive password manager
node scripts/teacher-password-manager.js
```

## Script Details

### 1. add-teacher-passwords.js
A simple script that:
- Finds all teachers without passwords
- Generates default passwords based on phone numbers
- Hashes and stores the passwords
- Provides a summary of the migration

**Default Password Format:** Last 6 digits of phone number + "123"
- Example: Phone `+1234567890` → Password `456789123`

### 2. teacher-password-manager.js
An interactive tool with the following features:
- Add passwords to teachers without them
- Reset all teacher passwords
- Update specific teacher password
- List teachers without passwords
- Verify password status
- Export teacher credentials (coming soon)

**Password Generation Strategies:**
1. **Phone-based**: Last 6 digits + "123"
2. **Random**: 8-character random string
3. **Simple**: "password123"
4. **Custom**: User-defined password

## Usage Examples

### Quick Migration
```bash
node scripts/add-teacher-passwords.js
```

### Interactive Management
```bash
node scripts/teacher-password-manager.js
```

Then follow the menu prompts:
1. Choose option 1 to add passwords to teachers without them
2. Select a password generation strategy
3. Review the generated credentials

## Security Notes

⚠️ **Important Security Considerations:**

1. **Default Passwords**: The generated default passwords are not secure for production use
2. **Password Change**: Teachers should be required to change their passwords on first login
3. **Credential Sharing**: Never share generated credentials in plain text over insecure channels
4. **Password Policy**: Consider implementing a strong password policy

## Environment Setup

Make sure you have:
- Node.js installed
- MongoDB running
- Environment variables set (MONGODB_URI in .env file)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env file
   - Verify network connectivity

2. **Permission Denied (Linux/Mac)**
   - Make the shell script executable: `chmod +x scripts/run-password-migration.sh`

3. **Module Not Found**
   - Run `npm install` in the Backend directory
   - Ensure you're in the correct directory

### Logs and Output

The scripts provide detailed logging:
- ✅ Success operations
- ❌ Error messages
- 📊 Statistics and summaries
- 🔑 Generated credentials (when requested)

## Integration with Authentication

After running the migration, update your authentication controller to:
1. Check for the password field in the Teacher model
2. Use bcrypt.compare() to verify passwords
3. Implement password change functionality
4. Add password strength validation

## Next Steps

1. Run the migration script
2. Update authentication logic
3. Implement password change functionality
4. Add password reset capabilities
5. Set up password policies
6. Train teachers on new login process

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Check file permissions (for shell scripts)

