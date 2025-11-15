const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Core system state
let order = null;
let status_code = "NO_ORDER";
let status_message = "No order yet. Place your order!";
let boxLocked = true;
let otp = null;
let password = null;
let anti_theft = false;
let delivered = false;
let fake_location = null;
let order_items = [];

// --- Polling endpoint used by all clients (robot + web UIs) ---
app.get('/api/status', (req, res) => {
  res.json({
    status_code,
    status_message,
    order_items,
    boxLocked,
    anti_theft,
    delivered,
    otp: status_code === "WAIT_OTP" ? otp : undefined,
    fake_location
  });
});

// --- Customer places order ---
app.post('/api/order', (req, res) => {
  order = req.body;
  order_items = order.items || [];
  password = order.password; // six digit password string
  fake_location = order.fake_location;
  status_code = "ORDERED";
  status_message = "Order received and packing in progress.";
  boxLocked = true;
  delivered = false;
  otp = String(Math.floor(100000 + Math.random() * 900000));
  anti_theft = false;
  res.json({ ok: true, status_code, status_message });
});

// --- Shopkeeper unlocks/locks box ---
app.post('/api/unlockBox', (req, res) => {
  boxLocked = false;
  status_message = "Box unlocked. Load items!";
  res.json({ ok: true, boxLocked });
});
app.post('/api/lockBox', (req, res) => {
  boxLocked = true;
  status_message = "Box locked. Ready for dispatch.";
  res.json({ ok: true, boxLocked });
});

// --- Shopkeeper dispatches the robot ---
app.post('/api/dispatch', (req, res) => {
  if (status_code !== "ORDERED") return res.status(400).json({ error: "No order to dispatch." });
  status_code = "DISPATCHED";
  status_message = "Robo dispatched. Arriving soon!";
  res.json({ ok: true, status_code });
});

// --- Robot: Arrived at delivery location (50cm logic triggers this) ---
app.post('/api/arrived', (req, res) => {
  if (status_code !== "DISPATCHED") return res.status(400).json({ error: "Not in transit." });
  status_code = "WAIT_PASSWORD";
  status_message = "Robo at your door! Enter your 6-digit password on the robot keypad.";
  res.json({ ok: true, status_code });
});

// --- Robot: Customer enters password ---
app.post('/api/enter-password', (req, res) => {
  if (status_code !== "WAIT_PASSWORD") return res.status(400).json({ error: "Not waiting for password." });
  if (req.body.password === password) {
    status_code = "WAIT_OTP";
    status_message = "Password accepted! Now enter the OTP shown on your order page.";
    res.json({ ok: true, status_code, status_message });
  } else {
    status_message = "Incorrect password! Try again.";
    res.json({ ok: false, status_code, status_message });
  }
});

// --- Robot: Customer enters OTP ---
app.post('/api/enter-otp', (req, res) => {
  if (status_code !== "WAIT_OTP") return res.status(400).json({ error: "Not waiting for OTP." });
  if (req.body.otp === otp) {
    status_code = "DELIVERED";
    status_message = "Delivery successful! Robo unlocking and moving back.";
    delivered = true;
    boxLocked = false;
    res.json({ ok: true, status_code, status_message });
  } else {
    status_message = "Incorrect OTP! Try again.";
    res.json({ ok: false, status_code, status_message });
  }
});

// --- Robot moves 50cm backwards after delivery (can be triggered by robot) ---
app.post('/api/return', (req, res) => {
  status_code = "RETURNING";
  status_message = "Robo returning to shop.";
  res.json({ ok: true, status_code, status_message });
});

// --- Anti-theft: Trigger and clear ---
app.post('/api/antitheft', (req, res) => {
  anti_theft = req.body.armed === true;
  status_message = anti_theft ? "Security alert! Robo has been lifted!" : status_message;
  res.json({ ok: true, anti_theft });
});

// --- Admin: full status and reset ---
app.post('/api/admin-reset', (req, res) => {
  order = null;
  order_items = [];
  boxLocked = true;
  password = null;
  otp = null;
  anti_theft = false;
  delivered = false;
  fake_location = null;
  status_code = "NO_ORDER";
  status_message = "System reset. Ready for new orders.";
  res.json({ ok: true, status_code });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Backend started on " + PORT));
