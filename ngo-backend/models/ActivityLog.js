import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "APPROVE",
        "PROMOTE",
        "DEMOTE",
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ["Beneficiary", "User"],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    entityName: String, // e.g., beneficiary full name or username
    performedBy: {
      type: String,
      required: true, // username of person who performed action
    },
    changes: {
      before: mongoose.Schema.Types.Mixed, // Previous values
      after: mongoose.Schema.Types.Mixed, // New values
    },
    description: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true },
);

// Create index for efficient querying
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ performedBy: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1 });

export default mongoose.model("ActivityLog", activityLogSchema);
