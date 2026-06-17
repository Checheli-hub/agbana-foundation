import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

async function rehash(identifier) {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });

  let users = [];
  if (identifier) {
    const query = identifier.includes("@")
      ? { email: identifier.toLowerCase().trim() }
      : { username: identifier.toLowerCase().trim() };
    const u = await User.findOne(query);
    if (!u) {
      console.error("User not found for:", identifier);
      await mongoose.disconnect();
      process.exitCode = 2;
      return;
    }
    users = [u];
  } else {
    users = await User.find();
  }

  for (const user of users) {
    const pwd = user.password || "";
    const alreadyHashed = /^\$2[aby]\$/.test(pwd);
    if (alreadyHashed) {
      console.log("Skipping already-hashed:", user.username);
      continue;
    }

    if (!pwd) {
      console.warn("No password set for:", user.username);
      continue;
    }

    const hashed = await bcrypt.hash(pwd, 12);
    user.password = hashed;
    await user.save();
    console.log("Re-hashed password for:", user.username);
  }

  await mongoose.disconnect();
}

const identifier = process.argv[2];
rehash(identifier).catch((err) => {
  console.error("Error rehashing passwords:", err.message || err);
  process.exit(1);
});
