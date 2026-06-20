import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ngo-beneficiary-system";

async function main() {
  console.log("Connecting to MongoDB URI:", MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", userSchema, "users");

    const username = "abdulkudus";
    const email = "abdulkudusyusuf79@gmail.com";

    let user = await User.findOne({ username }).lean();
    if (!user) {
      user = await User.findOne({ email }).lean();
    }

    if (!user) {
      console.log("User not found by username or email.");
    } else {
      console.log("User document:");
      console.log(JSON.stringify(user, null, 2));
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error connecting or querying MongoDB:", err && err.message);
    process.exit(2);
  }
}

main();
