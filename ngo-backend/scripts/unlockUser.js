import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

async function unlock(identifier) {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });

  const query = {};
  if (identifier.includes("@")) {
    query.email = identifier.toLowerCase().trim();
  } else {
    query.username = identifier.toLowerCase().trim();
  }

  const user = await User.findOne(query);
  if (!user) {
    console.error("User not found for:", identifier);
    await mongoose.disconnect();
    process.exitCode = 2;
    return;
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  console.log("Unlocked user:", user.username, `<${user.email}>`);
  await mongoose.disconnect();
}

const identifier = process.argv[2];
if (!identifier) {
  console.error("Usage: node scripts/unlockUser.js <username|email>");
  process.exit(1);
}

unlock(identifier).catch((err) => {
  console.error("Error unlocking user:", err.message || err);
  process.exit(1);
});
