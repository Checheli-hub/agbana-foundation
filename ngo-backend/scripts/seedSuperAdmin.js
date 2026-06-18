import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import bcrypt from "bcrypt";

const MONGODB_URI = process.env.MONGODB_URI;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

if (!SUPER_ADMIN_PASSWORD) {
  console.error("SUPER_ADMIN_PASSWORD is not defined in environment variables.");
  process.exit(1);
}

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await User.findOne({
      isSuperAdmin: true,
    });

    if (existingAdmin) {
      console.log("Super admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    const superAdmin = new User({
      username: "Abdulkudus",
      email: "abdulkudusyusuf79@gmail.com",
      password: hashedPassword,
      role: "Admin",
      isSuperAdmin: true,
      isVerified: true,
      isApproved: true,
    });

    await superAdmin.save();
    console.log("Super admin created successfully");
  } catch (error) {
    console.error("Failed to seed super admin:", error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedSuperAdmin();
