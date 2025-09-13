const { Types } = require('mongoose');

// Validate if a string is a valid MongoDB ObjectId
exports.isValidObjectId = (id) => {
  return Types.ObjectId.isValid(id);
};

// Format API response in a consistent way
exports.apiResponse = (res, { success = true, data = null, message = '', status = 200 }) => {
  return res.status(status).json({ success, data, message });
};

// Handle async/await errors in Express routes
exports.asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Generate a random string of specified length
exports.generateRandomString = (length = 8) => {
  return Math.random().toString(36).substring(2, length + 2);
};
