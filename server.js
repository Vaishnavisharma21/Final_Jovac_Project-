require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mental-wellness-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://localhost:27017/mental_wellness",
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

// Make user available to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Database connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/mental_wellness",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
  });

// Import models
const Sound = require("./models/Sound");
const User = require("./models/User");

// Import routes
const authRoutes = require("./routes/auth");
const soundRoutes = require("./routes/sounds");
const userRoutes = require("./routes/users");

// Use routes
app.use("/", authRoutes);
app.use("/sounds", soundRoutes);
app.use("/users", userRoutes);

// Home route - updated to fetch sounds from database
// Home route - updated to fetch sounds from database
app.get("/", async (req, res) => {
  try {
    const sounds = await Sound.find({ isPublic: true })
      .populate("uploader", "username")
      .sort({ createdAt: -1 })
      .limit(12);

    // Add full URL to each sound
    const soundsWithUrls = sounds.map((sound) => {
      return {
        ...sound.toObject(),
        fullUrl: sound.filePath, // This will be accessible in EJS
      };
    });

    res.render("index", {
      user: req.session.user,
      title: "Mental Wellness Soundboard",
      sounds: soundsWithUrls,
      currentMood: "all",
      messages: req.session.messages,
      getSoundIcon: (category) => {
        const icons = {
          calm: "cloud-rain",
          happy: "tree",
          sad: "fire",
          meditation: "om",
          all: "music",
        };
        return icons[category] || "music";
      },
    });

    delete req.session.messages;
  } catch (error) {
    console.error("Error fetching sounds:", error);
    res.render("index", {
      user: req.session.user,
      title: "Mental Wellness Soundboard",
      sounds: [],
      currentMood: "all",
      messages: { error: "Failed to load sounds" },
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Page Not Found",
    user: req.session.user,
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server Error:", error);
  res.status(500).render("error", {
    title: "Server Error",
    user: req.session.user,
    message: "Something went wrong!",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Visit: http://localhost:${PORT}`);
  console.log(`📁 Views directory: ${path.join(__dirname, "views")}`);
});
