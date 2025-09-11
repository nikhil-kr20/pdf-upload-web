const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// ======================
// Middleware & Config
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs'); // for frontend rendering
app.set('views', path.join(__dirname, 'views')); // connect to ejs views folder

// ======================
// Multer Setup - Store files in memory
// ======================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ======================
// Cloudinary Configuration
// ======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ======================
// MongoDB Connections
// ======================

// 1. PDF Storage Database
const pdfDB = mongoose.createConnection(process.env.PDF_DB_URI);

pdfDB.on('connected', () => console.log('✅ Connected to PDF Database (cloudnotes)'));

const noteSchema = require('./models/noteSchema');
const Note = pdfDB.model('Note', noteSchema);

// 2. User Authentication Database
const userDB = mongoose.createConnection(process.env.USER_DB_URI);

userDB.on('connected', () => console.log('✅ Connected to User Login Database (userlogs)'));

const userLoginSchema = require('./models/userlogin');
const User = userDB.model('UserLogin', userLoginSchema);

// ======================
// Routes
// ======================

// Home Page
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.send("Welcome to register page");
});

app.get('/login', (req, res) => {
  res.send("Welcome to login page");
});

// ======================
// User Registration
// ======================
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).send('User already exists');
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).send('Registration successful');
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).send('User already exists');
    }
    res.status(500).send('Registration failed');
  }
});

// ======================
// User Login
// ======================
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send('Username and password are required');
    }

    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).send('Invalid credentials');

    res.send('Login successful');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

// ======================
// Upload PDF - Save to Cloudinary, Store URL in MongoDB
// ======================
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload PDF to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // For PDFs and non-image files
          folder: 'pdf_uploads',
          public_id: Date.now() + '-' + req.file.originalname.replace(/\s+/g, '_'),
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      ).end(req.file.buffer);
    });

    // Save only URL + metadata to MongoDB
    const newNote = new Note({
      title: req.body.title,
      fileUrl: result.secure_url,
      fileType: req.file.mimetype,
    });

    await newNote.save();

    res.json({ success: true, message: 'File uploaded successfully', data: newNote });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// ======================
// View All Uploaded PDFs
// ======================
app.get('/read', async (req, res) => {
  try {
    const notes = await Note.find();
    res.render('read', { notes });
  } catch (err) {
    console.error('Error reading notes:', err);
    res.status(500).send('Error reading files');
  }
});

// ======================
// View Single File
// ======================
app.get('/view/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).send('File not found');

    // Redirect to the Cloudinary-hosted PDF
    res.redirect(note.fileUrl);
  } catch (err) {
    console.error('View error:', err);
    res.status(500).send('Error loading file');
  }
});

// ======================
// Download PDF
// ======================
app.get('/download/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).send('File not found');

    res.redirect(note.fileUrl); // Cloudinary handles direct file download
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Error downloading file');
  }
});

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
