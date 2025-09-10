const mongoose = require('mongoose');

// Mongoose schema for storing file in DB
const noteSchema = new mongoose.Schema({
  title: String,
  file: Buffer,           // File data stored here
  fileType: String        // Like 'application/pdf' or 'image/png'
});

module.exports = noteSchema;