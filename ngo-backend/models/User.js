import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "User"],
      default: "User",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordTokenExpiry: {
      type: Date,
      default: null,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    refreshTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Helper to determine whether a Super Admin exists excluding an optional user ID
const superAdminExists = async (excludeId = null) => {
  const query = { isSuperAdmin: true };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return mongoose.model("User").exists(query);
};

// Middleware to prevent creation or promotion of additional Super Admins
userSchema.pre("save", async function (next) {
  if (this.isModified("isSuperAdmin") && this.isSuperAdmin === true) {
    const existingSuperAdmin = await superAdminExists(this._id);
    if (existingSuperAdmin) {
      const error = new Error("Super Admin already exists");
      error.name = "SuperAdminExistsError";
      return next(error);
    }
  }
  next();
});

const blockSuperAdminUpdate = async function (next) {
  const update = this.getUpdate();
  const setValues = update.$set || update;
  if (setValues.isSuperAdmin === true) {
    const currentUser = await mongoose.model("User").findOne(this.getQuery());
    const excludeId = currentUser?._id || null;
    const existingSuperAdmin = await superAdminExists(excludeId);
    if (existingSuperAdmin) {
      const error = new Error("Super Admin already exists");
      error.name = "SuperAdminExistsError";
      return next(error);
    }
  }
  next();
};

userSchema.pre("findOneAndUpdate", blockSuperAdminUpdate);
userSchema.pre("updateOne", blockSuperAdminUpdate);

userSchema.index(
  { isSuperAdmin: 1 },
  { unique: true, partialFilterExpression: { isSuperAdmin: true } },
);

export default mongoose.model("User", userSchema);
