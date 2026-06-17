import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    identifier: null,
    verifyOnly: false,
    approveOnly: false,
    approvedBy: null,
  };
  if (args.length === 0) return out;
  out.identifier = args[0];
  args.slice(1).forEach((a) => {
    if (a === "--verify-only") out.verifyOnly = true;
    else if (a === "--approve-only") out.approveOnly = true;
    else if (a.startsWith("--approvedBy=")) out.approvedBy = a.split("=")[1];
    else if (a.startsWith("--approved-by=")) out.approvedBy = a.split("=")[1];
  });
  return out;
}

async function run() {
  const { identifier, verifyOnly, approveOnly, approvedBy } = parseArgs();

  if (!identifier) {
    console.error(
      "Usage: node scripts/verifyUser.js <username|email> [--verify-only] [--approve-only] [--approvedBy=adminUser]",
    );
    process.exit(1);
  }

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

  if (!approveOnly) {
    user.isVerified = true;
  }
  if (!verifyOnly) {
    user.isApproved = true;
    user.approvedBy = approvedBy || user.approvedBy || "script";
    user.approvedAt = new Date();
  }

  await user.save();

  const masked = { ...user.toObject() };
  if (masked.password) masked.password = masked.password.slice(0, 10) + "...";

  console.log("Updated user:");
  console.log(JSON.stringify(masked, null, 2));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error updating user:", err.message || err);
  process.exit(1);
});
