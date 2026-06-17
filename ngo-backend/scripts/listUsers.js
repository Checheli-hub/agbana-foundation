import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

async function listUsers() {
  await mongoose.connect(MONGODB_URI);

  const users = await User.find().lean();
  if (users.length === 0) {
    console.log("No users found in database.");
  } else {
    console.log(`Found ${users.length} users:`);
    users.forEach((u) => {
      console.log(`- Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, Verified: ${u.isVerified}, Approved: ${u.isApproved}`);
    });
  }

  await mongoose.disconnect();
}

listUsers().catch((err) => {
  console.error("Error listing users:", err.message || err);
  process.exit(1);
});
