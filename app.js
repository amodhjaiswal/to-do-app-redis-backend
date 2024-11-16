const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("MongoDB connected"));

// Initialize Redis with cluster URI
const redis = new Redis.Cluster([
  {
    host: "cash-application-redis.zograp.clustercfg.aps1.cache.amazonaws.com",
    port: 6379, // Default Redis port
  },
]);

redis.on("connect", () => console.log("Connected to Redis Cluster"));
redis.on("error", (err) => console.error("Redis Cluster error:", err));

// MongoDB schema
const todoSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const Todo = mongoose.model("Todo", todoSchema);

// Routes
app.get("/todos", async (req, res) => {
  const cacheKey = "todos";
  try {
    // Check Redis cache
    const cachedTodos = await redis.get(cacheKey);
    if (cachedTodos) {
      return res.json(JSON.parse(cachedTodos));
    }

    const todos = await Todo.find();
    await redis.setex(cacheKey, 3600, JSON.stringify(todos)); // Cache for 1 hour
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/todos", async (req, res) => {
  try {
    const newTodo = new Todo({
      task: req.body.task,
    });
    const savedTodo = await newTodo.save();

    // Clear Redis cache
    await redis.del("todos");

    res.status(201).json(savedTodo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
