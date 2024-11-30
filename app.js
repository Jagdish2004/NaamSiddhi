if(process.env.NODE_ENV != "PRODUCTION"){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import routes
const apiProfileRoutes = require('./routes/api/profiles');
const apiCaseRoutes = require('./routes/api/cases');
const newRecord = require('./routes/newRecord');
const searchRecord = require('./routes/searchRecord');
const dashboardRoute = require('./routes/dashboard');
const recordRoutes = require('./routes/recordRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const caseRoutes = require('./routes/cases');
const analyticsRoutes = require('./routes/analytics');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Enable CORS
app.use(cors());

// Enable compression
app.use(compression());

// View engine setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// Global middleware
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.session.user;
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    req.flash('error', err.message || 'Something went wrong!');
    res.redirect('back');
});

// Database connection
const dbURL = process.env.MONGO_URL;
mongoose.connect(dbURL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api', apiProfileRoutes);
app.use('/api', apiCaseRoutes);

// Web Routes
app.use("/", dashboardRoute);
app.use("/search", searchRecord);
app.use("/newrecord", newRecord);
app.use("/record", recordRoutes);
app.use('/cases', caseRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/api/suggestions', suggestionRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Server startup
const startServer = (port) => {
    try {
        app.listen(port, () => {
            console.log(`Server running on port:${port}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy, trying ${port + 1}`);
                startServer(port + 1);
            } else {
                console.error(err);
            }
        });
    } catch (err) {
        console.error('Error starting server:', err);
    }
};

const initialPort = process.env.PORT || 3000;
startServer(initialPort);