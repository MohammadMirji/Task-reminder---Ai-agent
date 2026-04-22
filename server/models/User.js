const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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
      default: null, // null for Google OAuth users (they have no password)
    },
    googleId: {
      type: String,
      default: null, // only set for Google OAuth users
    },
    avatar: {
      type: String,
      default: null, // Google profile picture
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);