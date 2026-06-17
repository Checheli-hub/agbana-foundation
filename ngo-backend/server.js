import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import authRoutes from "./routes/auth.js";
import beneficiariesRoutes from "./routes/beneficiaries.js";
import {
  initializeEmailService,
  validateEmailConfig,
} from "./services/emailService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";
const SESSION_SECRET = process.env.SESSION_SECRET;

// Build list of allowed client origins from env; support comma-separated list
const rawClientUrls = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawClientUrls.split(",").map((s) => s.trim());

if (process.env.NODE_ENV === "production" && !SESSION_SECRET) {
  console.error(
    "✗ SESSION_SECRET is required in production. Set SESSION_SECRET in your .env file.",
  );
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin) such as curl, server-to-server
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: SESSION_SECRET || "replace-with-long-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

// Routes
app.use("/auth", authRoutes);
app.use("/beneficiaries", beneficiariesRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "NGO Backend is running." });
});

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✓ Connected to MongoDB");

    // Validate and initialize email service
    validateEmailConfig();
    console.log("📧 Initializing email service...");
    try {
      await initializeEmailService();
      console.log("✓ Email service initialized");
    } catch (error) {
      console.warn("⚠ Email service initialization failed:", error.message);
    }

    // Start Server (after email service is ready)
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API Base: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("✗ MongoDB connection error:", error.message);
    process.exit(1);
  });
