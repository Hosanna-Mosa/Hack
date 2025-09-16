exports.health = (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
};

exports.root = (req, res) => {
  res.json({
    success: true,
    message: 'School Attendance Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      students: '/api/students',
      attendance: '/api/attendance'
    }
  });
};

exports.notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

