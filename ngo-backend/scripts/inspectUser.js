import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

async function inspect(identifier) {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });

  const query = {};
  if (identifier.includes("@")) {
    query.email = identifier.toLowerCase().trim();
  } else {
    query.username = identifier.toLowerCase().trim();
  }

  const user = await User.findOne(query).lean();
  if (!user) {
    console.error("User not found for:", identifier);
    await mongoose.disconnect();
    process.exitCode = 2;
    return;
  }

  // Mask password partially
  const masked = { ...user };
  if (masked.password) masked.password = masked.password.slice(0, 10) + "...";

  console.log(JSON.stringify(masked, null, 2));
  await mongoose.disconnect();
}

const identifier = process.argv[2];
if (!identifier) {
  console.error("Usage: node scripts/inspectUser.js <username|email>");
  process.exit(1);
}

inspect(identifier).catch((err) => {
  console.error("Error inspecting user:", err.message || err);
  process.exit(1);
});
