const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Collection name is required"],
      trim: true,
    },
    color: {
      type: String,
      default: "muted",
    },
    icon: {
      type: String,
      default: "folder",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1 });

module.exports = mongoose.model("Collection", collectionSchema);
