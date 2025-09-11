const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// ======================
// Cloudinary Configuration
// ======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ======================
// Middleware & Config
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ======================
// Multer Setup - Memory storage
// ======================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ======================
// MongoDB Connections
// ======================

// 1. PDF Database
const pdfDB = mongoose.createConnection(process.env.PDF_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
pdfDB.on('connected', () => console.log('✅ Connected to PDF Database'));
pdfDB.on('error', (err) => console.error('❌ PDF DB connection error:', err));

const noteSchema = require('./models/noteSchema');
const Note = pdfDB.model('Note', noteSchema);

// 2. User Database
const userDB = mongoose.createConnection(process.env.USER_DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
userDB.on('connected', () => console.log('✅ Connected to User Database'));
userDB.on('error', (err) => console.error('❌ User DB connection error:', err));

const userLoginSchema = require('./models/userlogin');
const User = userDB.model('UserLogin', userLoginSchema);

// ======================
// Routes
// ======================

// Home
app.get('/', (req, res) => res.render('index'));

// Register/Login pages
app.get('/register', (req, res) => res.send("Register Page"));
app.get('/login', (req, res) => res.send("Login Page"));

// ======================
// User Registration
// ======================
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).send('Username and password are required');

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).send('User already exists');

    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).send('Registration successful');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('Registration failed');
  }
});

// ======================
// User Login
// ======================
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).send('Username and password are required');

    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).send('Invalid credentials');

    res.send('Login successful');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

// ======================
// Upload PDF
// ======================
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // Required for PDFs
          folder: 'pdf_uploads', // Cloudinary auto-creates this folder
          public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`,
        },
        (error, uploadResult) => {
          if (error) return reject(error);
          resolve(uploadResult);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Save Cloudinary URL + metadata in MongoDB
    const newNote = new Note({
      title: req.body.title || req.file.originalname,
      fileUrl: result.secure_url,
      fileType: req.file.mimetype,
    });
    await newNote.save();

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: newNote,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// ======================
// View All PDFs
// ======================
app.get('/read', async (req, res) => {
  try {
    const notes = await Note.find();
    res.render('read', { notes });
  } catch (err) {
    console.error('Read error:', err);
    res.status(500).send('Error reading files');
  }
});

// ======================
// View Single PDF
// ======================
app.get('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId before querying MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid file ID');
    }

    const note = await Note.findById(id);
    if (!note) return res.status(404).send('File not found');

    res.redirect(note.fileUrl); // Redirect directly to Cloudinary link
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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid file ID');
    }

    const note = await Note.findById(id);
    if (!note) return res.status(404).send('File not found');

    res.redirect(note.fileUrl); // Cloudinary serves the file directly
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
