const bcrypt = require("bcryptjs/dist/bcrypt");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
    trim: true,
    minlength: [8, "Password must be at least 8 characters long"],
    maxlength: [128, "Password must be at most 128 characters long"],
  },
  cPassword: {
    type: String,
    required: false,
    trim: true,
    minlength: [8, "Password must be at least 8 characters long"],
    maxlength: [128, "Password must be at most 128 characters long"],
  },
});

// userSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   this.cPassword = undefined;
//   next();
// });

const Register = new mongoose.model("Users", userSchema);
module.exports = Register;
