const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs'); //use to render frontend site 
app.set('views', path.join(__dirname, 'views')); //connecting the ejs file 

// Multer setup (for storing files in memory before saving to DB)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ======================
// 1. Connect to Cluster 1 (PDF Storage)
// ======================
const pdfDB = mongoose.createConnection(process.env.PDF_DB_URI);

pdfDB.on('connected', () => console.log('✅ Connected to PDF Database (cloudnotes)'));

// Import Note Schema
const noteSchema = require('./models/noteSchema');
const Note = pdfDB.model('Note', noteSchema);

// ======================
// 2. Connect to Cluster 2 (User Login Storage)
// ======================
const userDB = mongoose.createConnection(process.env.USER_DB_URI);

userDB.on('connected', () => console.log('✅ Connected to User Login Database (userlogs)'));

// Import User Schema
const userLoginSchema = require('./models/userlogin');
const User = userDB.model('UserLogin', userLoginSchema);

// API endpoint to upload a file
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.send("welcome to register page"); 
});

app.get('/login', (req, res) => {
  res.send("welcome to login page"); 
});

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

    return res.status(201).send('Registration successful');
  } catch (err) {
    console.error('Register error:', err);
    if (err && err.code === 11000) {
      return res.status(409).send('User already exists');
    }
    res.status(500).send('Registration failed');
  }
});

// Login user
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

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      const message = 'No file uploaded';
      if (req.get('Accept') && req.get('Accept').includes('application/json')) {
        return res.status(400).json({ success: false, message });
      }
      return res.status(400).send(message);
    }

    const newNote = new Note({
      title: req.body.title,
      file: req.file.buffer,
      fileType: req.file.mimetype
    });
    await newNote.save();

    // If the client expects JSON (AJAX upload), return JSON
    if (req.get('Accept') && req.get('Accept').includes('application/json')) {
      return res.json({ success: true, id: newNote._id, title: newNote.title });
    }

    // Fallback for normal form submissions
    res.redirect('/read');
  } catch (err) {
    if (req.get('Accept') && req.get('Accept').includes('application/json')) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.status(500).send(err.message);
  }
});

// Route to read and display all uploaded PDFs
app.get('/read', async (req, res) => {
  try {
    // Fetch all PDFs from MongoDB
    const notes = await Note.find();

    // Render the read.ejs file and send notes data
    res.render('read', { notes });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading files from database');
  }
});

// API to download the file
app.get('/download/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);
  res.set('Content-Type', note.fileType);
  res.send(note.file);
});

// Route to view the file on a separate page
app.get('/view/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).send('File not found');
    }

    // Render a new EJS page to show the file
    res.render('viewFile', { note });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading file');
  }
});

app.get('/download/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).send('File not found');
    }

    res.set('Content-Type', note.fileType);
    res.set('Content-Disposition', `attachment; filename="${note.title}.pdf"`);
    res.send(note.file);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error downloading file');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port http://localhost:${PORT}`));
