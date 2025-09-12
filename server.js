const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
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
// Email Transporter
// ======================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map();

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTP(email, otp) {
    const mailOptions = {
        from: `"Cloud Notes" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your OTP for Cloud Notes Signup',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5;">Verify Your Email</h2>
                <p>Your OTP for Cloud Notes signup is:</p>
                <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
                </div>
                <p>This OTP is valid for 5 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px;">This is an automated message, please do not reply.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
}

// ======================
// Middleware & Config
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
    store: process.env.USER_DB_URI
      ? MongoStore.create({ mongoUrl: process.env.USER_DB_URI })
      : undefined,
  })
);

// Expose user to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

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

// Register/Login pages (simple text placeholders)
app.get('/register', (req, res) => res.send('Register Page'));
app.get('/login', (req, res) => res.send('Login Page'));

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// ======================
// OTP Endpoints
// ======================

// Send OTP to email
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username: email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Generate and store OTP
        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 300000, // 5 minutes
            verified: false
        });

        // Send OTP via email
        const emailSent = await sendOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP' });
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const otpData = otpStore.get(email);
        
        // Check if OTP exists
        if (!otpData) {
            return res.status(400).json({ success: false, message: 'No OTP found for this email. Please request a new OTP.' });
        }

        // Check if OTP is expired
        if (otpData.expiresAt < Date.now()) {
            otpStore.delete(email); // Clean up expired OTP
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        // Check if OTP matches
        if (otpData.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        // Mark as verified
        otpData.verified = true;
        otpStore.set(email, otpData);

        res.json({ 
            success: true, 
            message: 'OTP verified successfully',
            data: {
                emailVerified: true
            }
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ======================
// User Registration
// ======================
app.post('/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) return res.status(400).send('Name, email and password are required');

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).send('User already exists');

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashed });
    await newUser.save();

    req.session.user = { id: newUser._id.toString(), name: newUser.name, username: newUser.username };
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

    const user = await User.findOne({ username });
    if (!user) return res.status(401).send('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).send('Invalid credentials');

    req.session.user = { id: user._id.toString(), name: user.name, username: user.username };
    res.send('Login successful');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Login failed');
  }
});

// ======================
// Upload PDF
// ======================
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

app.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
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
      uploader: req.session.user.id,
      uploaderName: req.session.user.name || req.session.user.username,
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
    const notes = await Note.find()
      .populate({ path: 'uploader', model: User, select: 'name username' })
      .sort({ uploadedAt: -1 });
    // Do not override `user`; it's already exposed via res.locals from the session middleware
    res.render('read', { notes });
  } catch (err) {
    console.error('Read error:', err);
    res.status(500).send('Error reading files');
  }
});

// ======================
// User uploads by username
// ======================
app.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).send('Username required');

    // Try to find actual user by username (email/handle)
    const userDoc = await User.findOne({ username }).select('name username');

    let query = {};
    if (userDoc) {
      // Match either by ObjectId reference or by stored name/username string
      query = {
        $or: [
          { uploader: userDoc._id },
          { uploaderName: userDoc.username },
          { uploaderName: userDoc.name }
        ]
      };
    } else {
      // Fallback: match by uploaderName equals the provided param (supports name or username in URL)
      query = { uploaderName: username };
    }

    const notes = await Note.find(query).sort({ uploadedAt: -1 });

    const displayName = userDoc ? (userDoc.name || userDoc.username) : username;
    return res.render('userUploads', { username: displayName, notes, user: req.session.user || null });
  } catch (err) {
    console.error('User uploads error:', err);
    res.status(500).send('Failed to load user uploads');
  }
});

// ======================
// API: Notes by uploader (username or display name)
// ======================
app.get('/api/notes/by-uploader', async (req, res) => {
  try {
    const name = (req.query.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Missing name' });

    const userDoc = await User.findOne({ username: name }).select('_id name username');
    const query = userDoc
      ? { $or: [{ uploader: userDoc._id }, { uploaderName: userDoc.username }, { uploaderName: userDoc.name }] }
      : { uploaderName: name };

    const notes = await Note.find(query)
      .sort({ uploadedAt: -1 })
      .select('title fileUrl fileType uploadedAt');

    res.json({ success: true, notes });
  } catch (err) {
    console.error('API by-uploader error:', err);
    res.status(500).json({ success: false, message: 'Failed to load notes' });
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

    const note = await Note.findById(id).populate({ path: 'uploader', model: User, select: 'name username' });
    if (!note) return res.status(404).send('File not found');

    // Render viewer page with EJS (nicer experience)
    return res.render('viewFile', { note });
  } catch (err) {
    console.error('View error:', err);
    res.status(500).send('Error loading file');
  }
});

// ======================
// Download/Proxy PDF (streams bytes to avoid CORS for previews)
// ======================
app.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid file ID');
    }
    const note = await Note.findById(id);
    if (!note) return res.status(404).send('File not found');

    const targetUrl = note.fileUrl;
    const https = require('https');
    const { URL } = require('url');

    res.setHeader('Content-Type', note.fileType || 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const forward = (urlStr, redirects = 0) => {
      if (redirects > 5) {
        res.status(502).end('Too many redirects');
        return;
      }
      const u = new URL(urlStr);
      const options = {
        method: 'GET',
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        headers: {
          'User-Agent': 'Mozilla/5.0',
          // Forward range requests to enable partial fetch (helps PDF.js)
          ...(req.headers['range'] ? { Range: req.headers['range'] } : {}),
        },
      };
      const request = https.request(options, (r) => {
        const status = r.statusCode || 500;
        if (status >= 300 && status < 400 && r.headers.location) {
          const nextUrl = r.headers.location.startsWith('http') ? r.headers.location : `${u.protocol}//${u.host}${r.headers.location}`;
          r.resume();
          return forward(nextUrl, redirects + 1);
        }
        if (status >= 400) {
          res.status(status).end('Upstream error');
          return;
        }
        // Mirror useful headers
        if (r.headers['content-length']) res.setHeader('Content-Length', r.headers['content-length']);
        if (r.headers['accept-ranges']) res.setHeader('Accept-Ranges', r.headers['accept-ranges']);
        if (r.headers['content-range']) res.setHeader('Content-Range', r.headers['content-range']);
        if (req.headers['range'] && status === 206) res.status(206);
        r.pipe(res);
      });
      request.on('error', (e) => {
        console.error('Proxy error:', e);
        res.status(500).end('Proxy failed');
      });
      request.end();
    };

    forward(targetUrl);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Error downloading file');
  }
});

// ======================
// Profile
// ======================
app.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/');
  try {
    const me = await User.findById(req.session.user.id);
    const myNotes = await Note.find({ uploader: req.session.user.id }).sort({ uploadedAt: -1 });
    res.render('profile', { me, notes: myNotes });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Failed to load profile');
  }
});

app.post('/profile', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  try {
    const { name, username } = req.body;
    if (!name || !username) return res.status(400).send('Name and email are required');
    const existing = await User.findOne({ username, _id: { $ne: req.session.user.id } });
    if (existing) return res.status(409).send('Email already in use');
    const updated = await User.findByIdAndUpdate(
      req.session.user.id,
      { $set: { name, username } },
      { new: true }
    );
    req.session.user = { id: updated._id.toString(), name: updated.name, username: updated.username };
    res.send('Profile updated');
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send('Update failed');
  }
});

app.post('/profile/password', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).send('Both current and new passwords are required');
    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).send('User not found');
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).send('Current password is incorrect');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.send('Password updated');
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).send('Password update failed');
  }
});

// Delete an upload (owned by the logged-in user)
app.delete('/uploads/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid file ID');
    }
    const note = await Note.findById(id);
    if (!note) return res.status(404).send('File not found');
    if (!note.uploader || String(note.uploader) !== String(req.session.user.id)) {
      return res.status(403).send('Not allowed');
    }
    await Note.deleteOne({ _id: id });
    // Optional: Also delete from Cloudinary if you store public_id
    return res.send('Deleted');
  } catch (err) {
    console.error('Delete upload error:', err);
    res.status(500).send('Delete failed');
  }
});

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));