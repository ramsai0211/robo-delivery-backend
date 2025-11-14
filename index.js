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
    origin: "*", // Allow all origins or specify your frontend URL
  },
});

// In-memory order storage (replace with DB for production)
let orders = [];

// WebSocket connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("subscribeToOrder", (orderId) => {
    socket.join(orderId);
    console.log(`Client subscribed to order ${orderId}`);
  });
});

// Helper function to emit order status via WebSocket
function emitOrderStatus(order) {
  io.to(order.id.toString()).emit("orderStatusUpdate", order);
}

// REST API Endpoints

// Place a new order
app.post("/orders", (req, res) => {
  const order = {
    id: Date.now().toString(),
    status: "ORDERED",
    items: req.body.items || [],
    location: req.body.location || "",
    otp: Math.floor(100000 + Math.random() * 900000).toString(), // generate 6-digit OTP
  };
  orders.push(order);
  emitOrderStatus(order);
  res.status(201).json(order);
});

// Get all orders
app.get("/orders", (req, res) => {
  res.json(orders);
});

// Update order status
app.post("/orders/:id/status", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = req.body.status || order.status;
  emitOrderStatus(order);
  res.json(order);
});

// Example: Other specific status endpoints for clarity
app.post("/orders/:id/dispatch", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = "DISPATCHED";
  emitOrderStatus(order);
  res.json(order);
});

// You can add similar endpoints for open-box, close-box, arrived, password-verified, otp-verified, delivered, theft-alert, etc.

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});