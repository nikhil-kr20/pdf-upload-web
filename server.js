const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
// Database connection with proper error handling
mongoose.connect('mongodb://127.0.0.1:27017/notesDB')
  .then(() => {
    console.log('✅ Database connected successfully to MongoDB');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    console.log('Please make sure MongoDB is running on your system');
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs'); //use to render frontend site 
app.set('views', path.join(__dirname, 'views')); //connecting the ejs file 

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Mongoose schema for storing file in DB
const noteSchema = new mongoose.Schema({
  title: String,
  file: Buffer,           // File data stored here
  fileType: String        // Like 'application/pdf' or 'image/png'
});

const Note = mongoose.model('Note', noteSchema);

// API endpoint to upload a file
app.get('/', (req, res) => {
  res.render('index');
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


app.listen(5000, () => console.log('Server started on port http://localhost:5000'));
