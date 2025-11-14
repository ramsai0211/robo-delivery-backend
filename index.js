const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // update for your frontend live URL if strict
  },
});

// In-memory orders array (for demo; use a database for production)
let orders = [];

// Root endpoint (shows API is running)
app.get("/", (req, res) => {
  res.send("Robo Delivery Backend is Running!");
});

// Get all orders
app.get("/orders", (req, res) => {
  res.json(orders);
});

// Create a new order
app.post("/orders", (req, res) => {
  const { name, location, items, password } = req.body;
  // Validate required fields
  if (!name || !location || !Array.isArray(items) || items.length === 0 || !/^d{6}$/.test(password)) {
    return res.status(400).json({ error: "Missing or invalid order data!" });
  }
  const order = {
    id: Date.now().toString(),
    status: "ORDERED",
    name,
    location,
    items,
    password,
    otp: Math.floor(100000 + Math.random() * 900000).toString() // Generate 6-digit OTP
  };
  orders.push(order);
  emitOrderStatus(order);
  res.status(201).json(order);
});

// Change order status (generic)
app.post("/orders/:id/status", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = req.body.status || order.status;
  emitOrderStatus(order);
  res.json(order);
});

// Shopkeeper actions
app.post("/orders/:id/open-box", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "OPENED";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/close-box", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "PACKED";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/dispatch", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "DISPATCHED";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/arrived", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "ARRIVED_AT_CUSTOMER";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/password-verified", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "PASSWORD_VERIFIED";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/otp-verified", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "OTP_VERIFIED";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/delivered", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "DELIVERY_COMPLETED";
  emitOrderStatus(order);
  res.json(order);
});

// Anti-theft status updates
app.post("/orders/:id/theft-alert", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "THEFT_ALERT";
  emitOrderStatus(order);
  res.json(order);
});
app.post("/orders/:id/theft-resolved", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = "THEFT_RESOLVED";
  emitOrderStatus(order);
  res.json(order);
});

// WebSocket: status push future support
io.on("connection", (socket) => {
  socket.on("subscribeToOrder", (orderId) => {
    socket.join(orderId);
  });
});
function emitOrderStatus(order) {
  io.to(order.id).emit("orderStatusUpdate", order);
}

// Listen on correct port (Railway sets process.env.PORT)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
