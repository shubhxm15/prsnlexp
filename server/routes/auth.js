const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password_hash } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password_hash, user.password_hash))) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    req.session.user_id = user._id;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password_hash } = req.body;

    // Check if user exists
    if (await User.findOne({ $or: [{ username }, { email }] })) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password_hash, 12);
    const user = new User({ username, email, password_hash: hashedPassword });
    await user.save();

    res.json({ success: true, message: "Registration successful!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check auth
router.get("/check", (req, res) => {
  res.json({ authenticated: !!req.session.user_id });
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

module.exports = router;
