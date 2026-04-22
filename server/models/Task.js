const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date, default: null }, // date-only field, nothing nested
    notifyAt: { type: Date, default: null }, // separate field
    notified: { type: Boolean, default: false }, // separate field
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    tags: {
      type: [String],
      default: [],
    },
    userPrompt: { type: String, default: '' },
  },
  { timestamps: true }, // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("Task", taskSchema);
