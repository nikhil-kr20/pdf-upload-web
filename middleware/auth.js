const { Types } = require('mongoose');

// Middleware to check if user is authenticated
exports.requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// Middleware to validate ObjectId
exports.validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  next();
};

// Middleware to check if user is the owner of the resource
exports.checkOwnership = (model) => async (req, res, next) => {
  try {
    const doc = await model.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    // Check if the uploader is a string (legacy) or ObjectId
    const isOwner = doc.uploader.toString() === req.session.user.id || 
                   (doc.uploaderName && doc.uploaderName === req.session.user.username);
                   
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to perform this action' });
    }
    
    req.resource = doc;
    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ success: false, message: 'Server error during ownership verification' });
  }
};
