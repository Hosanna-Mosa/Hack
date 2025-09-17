const jwt = require('jsonwebtoken');
const Parent = require('../models/Parent');

const parentAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const secret = process.env.JWT_SECRET || 'dev_default_jwt_secret_change_me';
    const decoded = jwt.verify(token, secret);
    
    // Check if the token is for a parent
    if (decoded.role !== 'parent') {
      return res.status(401).json({ message: 'Invalid token for parent access' });
    }
    
    const parent = await Parent.findById(decoded.id).select('-password');
    
    if (!parent) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = { id: parent._id, role: 'parent' };
    req.parent = parent;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { parentAuth };
