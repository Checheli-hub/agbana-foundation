import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import {
  sendVerificationEmail,
  sendApprovalEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendDisapprovalEmail,
} from "../services/emailService.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a few minutes before trying again.",
  },
});

router.use("/login", authLimiter);
router.use("/register", authLimiter);
router.use("/reset-password", authLimiter);
router.use("/initialize", authLimiter);

const logAuditAction = async (
  actionType,
  performedBy,
  targetUser,
  targetUserEmail = null,
  details = null,
  req = null,
  status = "success",
  errorMessage = null,
) => {
  try {
    const auditEntry = new AuditLog({
      actionType,
      performedBy,
      targetUser,
      targetUserEmail,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get("user-agent") || null,
      status,
      errorMessage,
    });
    await auditEntry.save();
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
};

const generateToken = () => crypto.randomBytes(32).toString("hex");

const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const caseInsensitiveQuery = (field, value) => ({
  [field]: { $regex: new RegExp(`^${escapeRegex(value.trim())}$`, "i") },
});

const getSessionUser = (req) => req.session?.user || null;

const isSuperAdminSession = (req) => {
  const user = getSessionUser(req);
  return Boolean(user && user.role === "Admin" && user.isSuperAdmin === true);
};

const normalizeRole = (role) => {
  if (!role) return "";
  if (/^admin$/i.test(role)) return "Admin";
  if (/^user$/i.test(role)) return "User";
  return role;
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

const isAccountLocked = (user) => {
  return user.lockUntil && user.lockUntil > Date.now();
};

const pendingDeleteTimers = new Map();

const cancelScheduledDeletion = (userId) => {
  const existing = pendingDeleteTimers.get(String(userId));
  if (existing) {
    clearTimeout(existing);
    pendingDeleteTimers.delete(String(userId));
  }
};

const schedulePermanentDeletion = (userId) => {
  const idString = String(userId);
  if (pendingDeleteTimers.has(idString)) {
    return;
  }

  const timeoutId = setTimeout(async () => {
    try {
      const user = await User.findById(idString);
      if (
        user &&
        user.isDeleted &&
        user.deletedAt &&
        Date.now() - user.deletedAt.getTime() >= 60000
      ) {
        await User.deleteOne({ _id: idString });
      }
    } catch (error) {
      console.error("Error finalizing user deletion:", error);
    } finally {
      pendingDeleteTimers.delete(idString);
    }
  }, 60000);

  pendingDeleteTimers.set(idString, timeoutId);
};

const incrementLoginAttempts = async (user) => {
  if (user.lockUntil && user.lockUntil < Date.now()) {
    user.loginAttempts = 1;
    user.lockUntil = null;
  } else {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME);
    }
  }
  await user.save();
};

const resetLoginAttempts = async (user) => {
  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();
};

// Email functions now imported from emailService.js

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: "Username, email, password, and role are required." });
    }

    const user = await User.findOne({
      ...caseInsensitiveQuery("username", username),
      ...caseInsensitiveQuery("email", email),
      role: { $regex: new RegExp(`^${escapeRegex(role.trim())}$`, "i") },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (isAccountLocked(user)) {
      return res.status(423).json({
        error:
          "Account locked due to too many failed login attempts. Try again later.",
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      await incrementLoginAttempts(user);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
      await resetLoginAttempts(user);
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Email not verified",
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: "Account not approved by admin",
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      });
    }

    const normalizedRole = normalizeRole(user.role);
    const newRefreshToken = generateToken();
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newAccessToken = generateToken();
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = refreshTokenExpiry;
    await user.save();

    await regenerateSession(req);
    req.session.user = {
      username: user.username,
      email: user.email,
      role: normalizedRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
    };
    req.session.accessToken = newAccessToken;
    req.session.accessTokenExpiry = accessTokenExpiry;

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      username: user.username,
      email: user.email,
      role: normalizedRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      accessToken: newAccessToken,
      accessTokenExpiry,
      refreshToken: newRefreshToken,
      refreshTokenExpiry,
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: normalizeRole(u.role),
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required." });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      if (
        existingUser.username === normalizedUsername &&
        existingUser.email === normalizedEmail
      ) {
        return res.status(400).json({
          error: "Username and email are already in use.",
        });
      } else if (existingUser.username === normalizedUsername) {
        return res.status(400).json({ error: "Username is already in use." });
      } else {
        return res.status(400).json({ error: "Email is already in use." });
      }
    }

    const verificationToken = crypto.randomBytes(20).toString("hex");

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "User",
      isVerified: false,
      verificationToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isApproved: false,
    });

    await newUser.save();

    // Fire-and-forget sending of verification email so response is immediate
    sendVerificationEmail(newUser.email, newUser.username, verificationToken)
      .then((r) => console.info("Verification email result:", r))
      .catch((e) => console.error("Verification email error:", e));

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
      verificationToken: verificationToken, // Backup for manual verification
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/initialize
router.post("/initialize", async (req, res) => {
  try {
    const { username, email, password, secret } = req.body;
    const initializeSecret = process.env.INITIALIZE_SECRET;

    if (!initializeSecret) {
      return res.status(403).json({
        error:
          "Admin initialization is disabled. Set INITIALIZE_SECRET to enable this endpoint.",
      });
    }

    if (secret !== initializeSecret) {
      return res.status(403).json({ error: "Invalid initialization secret." });
    }

    if (!username || !email || !password) {
      return res.status(400).json({
        error:
          "Username, email, and password are required to initialize the first admin account.",
      });
    }

    const adminExists = await User.exists({
      role: { $regex: /^Admin$/i },
    });

    if (adminExists) {
      return res.status(403).json({
        error:
          "An admin account already exists. Initialize can only be used once.",
      });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Username or email is already in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "Admin",
      isVerified: true,
      isApproved: true,
      isSuperAdmin: false, // Prevent Super Admin creation through this endpoint
      verificationToken: null,
      verificationTokenExpiry: null,
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin account initialized successfully.",
      admin: {
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/admin
router.post("/admin", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!isSuperAdminSession(req)) {
      return res.status(403).json({
        error: "Only a super admin may create new admin accounts.",
      });
    }

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required." });
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: email.toLowerCase().trim() },
      ],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = new User({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "Admin",
      isSuperAdmin: false,
      isVerified: true,
      isApproved: true,
    });

    await newAdmin.save();

    await logAuditAction(
      "create_admin",
      req.session.user?.username,
      newAdmin.username,
      newAdmin.email,
      `Created new admin account`,
      req,
      "success",
    );

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.status(201).json({
      user: {
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
      },
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword, username, email, role } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "newPassword is required." });
    }

    if (token) {
      const user = await User.findOne({ resetPasswordToken: token });
      if (!user) {
        return res
          .status(404)
          .json({ error: "Invalid or expired reset token." });
      }

      if (
        !user.resetPasswordTokenExpiry ||
        user.resetPasswordTokenExpiry < new Date()
      ) {
        return res.status(410).json({ error: "Reset token has expired." });
      }

      user.password = await bcrypt.hash(newPassword, 12);
      user.resetPasswordToken = null;
      user.resetPasswordTokenExpiry = null;
      await user.save();

      return res.json({ message: "Password has been reset successfully." });
    }

    if (!email || !role) {
      return res.status(400).json({
        error: "Email and role are required for direct password reset.",
      });
    }

    const query = {
      ...caseInsensitiveQuery("email", email),
      role: { $regex: new RegExp(`^${escapeRegex(role.trim())}$`, "i") },
    };

    if (username) {
      Object.assign(query, caseInsensitiveQuery("username", username));
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ error: "No matching account found." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiry = null;
    await user.save();

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/request-password-reset
router.post("/request-password-reset", async (req, res) => {
  try {
    const { username, email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    const query = {
      ...caseInsensitiveQuery("email", email),
      role: { $regex: new RegExp(`^${escapeRegex(role.trim())}$`, "i") },
    };

    if (username) {
      Object.assign(query, caseInsensitiveQuery("username", username));
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ error: "No matching account found." });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    sendPasswordResetEmail(user.email, user.username, resetToken)
      .then((r) => console.info("Password reset email result:", r))
      .catch((e) => console.error("Password reset email error:", e));

    res.json({
      message:
        "Password reset instructions have been sent to your email address.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/users
router.get("/users", async (req, res) => {
  try {
    await cleanupDeletedUsers();
    const allUsers = await User.find({ isDeleted: { $ne: true } });
    res.json({
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/verify?token=...
router.get("/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res.status(400).json({ error: "Verification token is required." });

    const user = await User.findOne({ verificationToken: token });
    if (!user)
      return res
        .status(404)
        .json({ error: "Invalid or expired verification token." });

    if (
      user.verificationTokenExpiry &&
      user.verificationTokenExpiry < new Date()
    ) {
      return res.status(410).json({ error: "Verification token has expired." });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    sendWelcomeEmail(user.email, user.username, user.isApproved)
      .then((r) => console.info("Welcome email result:", r))
      .catch((e) => console.error("Welcome email error:", e));

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/approve
router.post("/approve", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may approve accounts." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const user = await User.findOne(caseInsensitiveQuery("username", username));

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Only set approval fields here — do not modify isVerified
    user.isApproved = true;
    user.approvedBy = req.session.user?.username || null;
    user.approvedAt = new Date();
    await user.save();

    await logAuditAction(
      "approve",
      req.session.user?.username,
      user.username,
      user.email,
      `User account approved`,
      req,
      "success",
    );

    // Fire-and-forget sending of approval email so UI updates immediately
    sendApprovalEmail(user.email, user.username)
      .then((r) => console.info("Approval email result:", r))
      .catch((e) => console.error("Approval email error:", e));

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      message: "User approved successfully.",
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/disapprove
router.post("/disapprove", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may disapprove accounts." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const user = await User.findOne(caseInsensitiveQuery("username", username));

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.isApproved = false;
    user.approvedBy = null;
    user.approvedAt = null;
    await user.save();

    await logAuditAction(
      "disapprove",
      req.session.user?.username,
      user.username,
      user.email,
      `User account disapproved`,
      req,
      "success",
    );

    // Fire-and-forget sending of disapproval email
    sendDisapprovalEmail(user.email, user.username)
      .then((r) => console.info("Disapproval email result:", r))
      .catch((e) => console.error("Disapproval email error:", e));

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      message: "User disapproved successfully.",
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/delete
router.post("/delete", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may delete accounts." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    if (
      req.session.user?.username &&
      username.trim().toLowerCase() ===
        req.session.user.username.trim().toLowerCase()
    ) {
      return res.status(400).json({
        error: "You cannot delete the account currently signed in.",
      });
    }

    const user = await User.findOne(caseInsensitiveQuery("username", username));

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isDeleted) {
      return res
        .status(400)
        .json({ error: "User account is already deleted." });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    await logAuditAction(
      "delete",
      req.session.user?.username,
      user.username,
      user.email,
      `User account deleted`,
      req,
      "success",
    );

    schedulePermanentDeletion(user._id);

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      message: "User deleted successfully.",
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/restore
router.post("/restore", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may restore accounts." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const user = await User.findOne({
      ...caseInsensitiveQuery("username", username),
      isDeleted: true,
    });

    if (!user) {
      return res.status(404).json({ error: "Deleted user not found." });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    await logAuditAction(
      "restore",
      req.session.user?.username,
      user.username,
      user.email,
      `User account restored`,
      req,
      "success",
    );

    cancelScheduledDeletion(user._id);

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      message: "User restored successfully.",
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        error: "Username and email are required.",
      });
    }

    const user = await User.findOne({
      ...caseInsensitiveQuery("username", username),
      ...caseInsensitiveQuery("email", email),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({
        error: "This email is already verified.",
      });
    }

    // Generate new verification token
    const newToken = crypto.randomBytes(20).toString("hex");
    user.verificationToken = newToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Fire-and-forget sending of verification email
    sendVerificationEmail(user.email, user.username, newToken)
      .then((r) => console.info("Resent verification email result:", r))
      .catch((e) => console.error("Resent verification email error:", e));

    res.json({
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/logout
router.post("/logout", async (req, res) => {
  try {
    if (req.session.user?.email) {
      await User.updateOne(
        { email: req.session.user.email },
        { refreshToken: null, refreshTokenExpiry: null },
      );
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed." });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully." });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/refresh-token
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    const user = await User.findOne({
      refreshToken,
      refreshTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token." });
    }

    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = refreshTokenExpiry;
    await user.save();

    await regenerateSession(req);
    const normalizedRole = normalizeRole(user.role);
    req.session.user = {
      username: user.username,
      email: user.email,
      role: normalizedRole,
      isSuperAdmin: Boolean(user.isSuperAdmin),
    };
    req.session.accessToken = newAccessToken;
    req.session.accessTokenExpiry = accessTokenExpiry;

    res.json({
      accessToken: newAccessToken,
      accessTokenExpiry,
      refreshToken: newRefreshToken,
      refreshTokenExpiry,
      user: {
        username: user.username,
        email: user.email,
        role: normalizedRole,
        isSuperAdmin: Boolean(user.isSuperAdmin),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/audit-logs (Super Admin only)
router.get("/audit-logs", async (req, res) => {
  try {
    if (!isSuperAdminSession(req)) {
      return res.status(403).json({
        error: "Only super admin may view audit logs.",
      });
    }

    const {
      limit = 100,
      skip = 0,
      actionType,
      performedBy,
      targetUser,
    } = req.query;

    const filter = {};
    if (actionType) filter.actionType = actionType;
    if (performedBy)
      filter.performedBy = new RegExp(
        `^${escapeRegex(performedBy.trim())}$`,
        "i",
      );
    if (targetUser)
      filter.targetUser = new RegExp(
        `^${escapeRegex(targetUser.trim())}$`,
        "i",
      );

    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments(filter);

    res.json({
      auditLogs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/promote
router.post("/promote", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may promote users." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const user = await User.findOneAndUpdate(
      caseInsensitiveQuery("username", username),
      {
        role: "Admin",
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await logAuditAction(
      "promote",
      req.session.user?.username,
      user.username,
      user.email,
      `User promoted to Admin role`,
      req,
      "success",
    );

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isApproved: u.isApproved,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/demote
router.post("/demote", async (req, res) => {
  try {
    const { username } = req.body;

    if (!isSuperAdminSession(req)) {
      return res
        .status(403)
        .json({ error: "Only a super admin may demote users." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    const user = await User.findOneAndUpdate(
      caseInsensitiveQuery("username", username),
      { role: "User" },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await logAuditAction(
      "demote",
      req.session.user?.username,
      user.username,
      user.email,
      `User demoted to User role`,
      req,
      "success",
    );

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /auth/update
router.post("/update", async (req, res) => {
  try {
    const { username, updates } = req.body;

    if (!username || !updates) {
      return res
        .status(400)
        .json({ error: "Username and updates are required." });
    }

    // Sanitize updates to allow only specific fields
    const allowedUpdates = {};
    if (updates.username) {
      allowedUpdates.username = updates.username.toLowerCase().trim();
    }
    if (updates.email) {
      allowedUpdates.email = updates.email.toLowerCase().trim();
    }
    if (updates.password) {
      allowedUpdates.password = await bcrypt.hash(updates.password, 12);
    }

    const user = await User.findOneAndUpdate(
      caseInsensitiveQuery("username", username),
      allowedUpdates,
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const allUsers = await User.find({ isDeleted: { $ne: true } });

    res.json({
      users: allUsers.map((u) => ({
        username: u.username,
        email: u.email,
        role: u.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
