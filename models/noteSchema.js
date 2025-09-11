const mongoose = require('mongoose');

// Mongoose schema for storing only file metadata
const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String, // Cloudinary URL
    required: true,
  },
  fileType: {
    type: String, // e.g., 'application/pdf'
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = noteSchema;
