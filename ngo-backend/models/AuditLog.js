import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: ["create_admin", "approve", "disapprove", "delete", "restore", "promote", "demote"],
      required: true,
    },
    performedBy: {
      type: String,
      required: true,
    },
    targetUser: {
      type: String,
      required: true,
    },
    targetUserEmail: {
      type: String,
      default: null,
    },
    details: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Index for efficient queries
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
