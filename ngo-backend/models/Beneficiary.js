import mongoose from "mongoose";

const beneficiarySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    passport: String,
    category: {
      type: String,
      enum: ["New Beneficiary", "Past Beneficiary"],
      default: "New Beneficiary",
    },
    empowermentType: String,
    dateAdded: {
      type: String,
      required: true,
    },
    called: {
      type: Boolean,
      default: false,
    },
    calledAt: String,
    status: {
      type: String,
      enum: ["Active", "Inactive", "Closed"],
      default: "Active",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Create indexes for common queries
beneficiarySchema.index({ fullName: 1 });
beneficiarySchema.index({ phone: 1 });
beneficiarySchema.index({ category: 1 });
beneficiarySchema.index({ status: 1 });
beneficiarySchema.index({ createdAt: -1 });

export default mongoose.model("Beneficiary", beneficiarySchema);
