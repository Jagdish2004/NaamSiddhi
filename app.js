if(process.env.NODE_ENV != "PRODUCTION"){
  require('dotenv').config();
    
};

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const profileSchema =require("./models/profileSchema");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require('express-session');
const flash = require('connect-flash');
const newRecord = require('./routes/newRecord');
const searchRecord = require('./routes/searchRecord');
const dashboardRoute = require('./routes/dashboard');
const recordRoutes = require('./routes/recordRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');




const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(suggestionRoutes);

// Configure session
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

// Configure flash
app.use(flash());

// Flash middleware
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

const dbURL = process.env.MONGO_URL

// Linking the database
main().then(() => {
  console.log("connected to mongoDB");
}).catch(err => console.log(err));

async function main() {
  await mongoose.connect(dbURL);
}

// Routes
app.use("/", dashboardRoute);
app.use("/search", searchRecord);
app.use("/newrecord", newRecord);
app.use("/record", recordRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/settings', settingsRoutes);

// Modified server start logic
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

// Start server with initial port
const initialPort = process.env.PORT || 3000;
startServer(initialPort);