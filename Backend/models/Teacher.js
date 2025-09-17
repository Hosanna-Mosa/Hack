const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    assignedClassIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
    },
    metadata: {
      qualifications: [
        {
          degree: String,
          institution: String,
          year: Number,
          subject: String,
        },
      ],
      experience: {
        years: {
          type: Number,
          min: 0,
        },
        previousSchools: [String],
      },
      subjects: [String],
      department: String,
      employeeId: {
        type: String,
        unique: true,
        sparse: true,
      },
      joiningDate: Date,
      salary: {
        type: Number,
        min: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
teacherSchema.index({ userId: 1 });
teacherSchema.index({ phoneNumber: 1 });
teacherSchema.index({ schoolId: 1 });
teacherSchema.index({ assignedClassIds: 1 });
teacherSchema.index({ "metadata.employeeId": 1 });

// Virtual to populate user data
teacherSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate school data
teacherSchema.virtual("school", {
  ref: "School",
  localField: "schoolId",
  foreignField: "_id",
  justOne: true,
});

// Virtual to populate assigned classes
teacherSchema.virtual("assignedClasses", {
  ref: "Class",
  localField: "assignedClassIds",
  foreignField: "_id",
});

// Ensure virtual fields are serialized
teacherSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    // Remove sensitive fields
    delete ret.password;
    return ret;
  },
});
teacherSchema.set("toObject", { virtuals: true });

// Virtual for setting plain (unhashed) password
teacherSchema.virtual("plainPassword").set(function (plainPassword) {
  this._plainPassword = plainPassword;
});

// Instance method to compare passwords
teacherSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving when needed
teacherSchema.pre("save", async function (next) {
  try {
    // If a plain password was provided via virtual, hash it
    if (this._plainPassword) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this._plainPassword, salt);
      this._plainPassword = undefined;
      return next();
    }

    // If password field was modified and is not already a bcrypt hash, hash it
    if (this.isModified("password") && typeof this.password === "string") {
      const looksHashed =
        this.password.startsWith("$2a$") ||
        this.password.startsWith("$2b$") ||
        this.password.startsWith("$2y$");
      if (!looksHashed) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Teacher", teacherSchema);
