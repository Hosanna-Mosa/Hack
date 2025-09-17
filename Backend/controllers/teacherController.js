const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const School = require("../models/School");
const Class = require("../models/Class");

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || "dev_default_jwt_secret_change_me";
  const expiresIn = process.env.JWT_EXPIRE || "7d";
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn });
};

// Teacher login with phone number or email
exports.teacherLogin = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number and password are required",
      });
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

    // Find teacher using aggregation to search directly by phone number in Teacher model
    const teacherResult = await Teacher.aggregate([
      {
        $match: {
          phoneNumber: normalizedPhone,
          isActive: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.role": "teacher",
          "user.isActive": true,
        },
      },
      {
        $lookup: {
          from: "schools",
          localField: "schoolId",
          foreignField: "_id",
          as: "school",
        },
      },
      {
        $lookup: {
          from: "classes",
          localField: "assignedClassIds",
          foreignField: "_id",
          as: "assignedClasses",
        },
      },
      {
        $unwind: {
          path: "$school",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    console.log("phone number ok passowrd checking", teacherResult);

    // If no teacher found with direct phone number, try fallback search in User model
    if (!teacherResult || teacherResult.length === 0) {
      console.log(
        "No teacher found with direct phone number, trying fallback search..."
      );

      const fallbackResult = await Teacher.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $match: {
            "user.role": "teacher",
            "user.isActive": true,
            $or: [
              { "user.profile.contact.phone": normalizedPhone },
              { "user.username": phoneNumber },
              { "user.profile.contact.email": phoneNumber.toLowerCase() },
            ],
          },
        },
        {
          $lookup: {
            from: "schools",
            localField: "schoolId",
            foreignField: "_id",
            as: "school",
          },
        },
        {
          $lookup: {
            from: "classes",
            localField: "assignedClassIds",
            foreignField: "_id",
            as: "assignedClasses",
          },
        },
        {
          $unwind: {
            path: "$school",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
      console.log("before fall back");

      if (!fallbackResult || fallbackResult.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid phone number or password",
        });
      }

      // Use fallback result
      const teacherData = fallbackResult[0];
      const user = teacherData.user;
      console.log("password dene");

      // Verify password using Teacher model's password field
      // Check if teacher has a password set
      if (!teacherData.password) {
        console.log(
          "Teacher password not set for teacher (fallback):",
          teacherData._id
        );
        return res.status(401).json({
          success: false,
          message: "Teacher password not set. Please contact administrator.",
        });
      }

      console.log(
        "Comparing password (fallback):",
        password,
        "with hashed:",
        teacherData.password.substring(0, 20) + "..."
      );
      const isMatch = await bcrypt.compare(password, teacherData.password);
      console.log("Password match result (fallback):", isMatch);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid phone number or password",
        });
      }

      if (!teacherData.isActive) {
        return res.status(403).json({
          success: false,
          message: "Teacher account is deactivated",
        });
      }

      // Generate token
      const token = signToken({ _id: user._id, role: user.role });

      // Prepare response data - remove sensitive information
      const { passwordHash, ...userWithoutPassword } = user;
      const { password: teacherPassword, ...teacherWithoutPassword } =
        teacherData;

      const responseData = {
        success: true,
        token,
        user: {
          ...userWithoutPassword,
          schoolId: teacherWithoutPassword.schoolId,
          school: teacherWithoutPassword.school,
          teacherProfile: {
            assignedClasses: teacherWithoutPassword.assignedClasses,
            employeeId: teacherWithoutPassword.metadata?.employeeId,
            department: teacherWithoutPassword.metadata?.department,
            subjects: teacherWithoutPassword.metadata?.subjects,
            joiningDate: teacherWithoutPassword.metadata?.joiningDate,
          },
        },
      };

      return res.json(responseData);
    }

    const teacherData = teacherResult[0];
    const user = teacherData.user;
    console.log("password dene", password, teacherData.password);

    // Verify password using Teacher model's password field
    // Check if teacher has a password set
    if (!teacherData.password) {
      console.log("Teacher password not set for teacher:", teacherData._id);
      return res.status(401).json({
        success: false,
        message: "Teacher password not set. Please contact administrator.",
      });
    }

    console.log(
      "Comparing password:",
      password,
      "with hashed:",
      teacherData.password.substring(0, 20) + "..."
    );
    const isMatch = await bcrypt.compare(password, teacherData.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    if (!teacherData.isActive) {
      return res.status(403).json({
        success: false,
        message: "Teacher account is deactivated",
      });
    }

    // Generate token
    const token = signToken({ _id: user._id, role: user.role });

    // Prepare response data - remove sensitive information
    const { passwordHash, ...userWithoutPassword } = user;
    const { password: teacherPassword, ...teacherWithoutPassword } =
      teacherData;

    const responseData = {
      success: true,
      token,
      user: {
        ...userWithoutPassword,
        schoolId: teacherWithoutPassword.schoolId,
        school: teacherWithoutPassword.school,
        teacherProfile: {
          assignedClasses: teacherWithoutPassword.assignedClasses,
          employeeId: teacherWithoutPassword.metadata?.employeeId,
          department: teacherWithoutPassword.metadata?.department,
          subjects: teacherWithoutPassword.metadata?.subjects,
          joiningDate: teacherWithoutPassword.metadata?.joiningDate,
        },
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error("Teacher login error:", error);
    next(error);
  }
};

// Get teacher profile with detailed information
exports.getTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const teacher = await Teacher.findOne({ userId })
      .populate("schoolId", "name address contactInfo settings")
      .populate("assignedClassIds", "name grade section subject")
      .populate("userId", "profile username role");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    res.json({
      success: true,
      teacher: {
        ...teacher.toJSON(),
        user: teacher.userId,
      },
    });
  } catch (error) {
    console.error("Get teacher profile error:", error);
    next(error);
  }
};

// Get teacher's assigned classes
exports.getAssignedClasses = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const teacher = await Teacher.findOne({ userId })
      .populate("assignedClassIds", "name grade section subject studentCount")
      .populate("schoolId", "name");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    res.json({
      success: true,
      classes: teacher.assignedClassIds,
      school: teacher.schoolId,
    });
  } catch (error) {
    console.error("Get assigned classes error:", error);
    next(error);
  }
};

// Update teacher profile
exports.updateTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.schoolId;
    delete updates._id;

    // If phone number is being updated, also update the User model
    if (updates.phoneNumber) {
      const normalizedPhone = updates.phoneNumber.replace(/[\s\-\(\)]/g, "");

      // Check if phone number is already used by another teacher
      const existingTeacher = await Teacher.findOne({
        phoneNumber: normalizedPhone,
        userId: { $ne: userId },
      });

      if (existingTeacher) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already in use by another teacher",
        });
      }

      // Update phone number in Teacher model
      updates.phoneNumber = normalizedPhone;

      // Also update the User model's phone number
      await User.findByIdAndUpdate(userId, {
        $set: {
          "profile.contact.phone": normalizedPhone,
        },
      });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("schoolId", "name");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      teacher,
    });
  } catch (error) {
    console.error("Update teacher profile error:", error);
    next(error);
  }
};

// Get teacher dashboard data
exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const teacher = await Teacher.findOne({ userId })
      .populate("schoolId", "name")
      .populate("assignedClassIds", "name grade section");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
    }

    // Get class statistics
    const classStats = await Class.aggregate([
      { $match: { _id: { $in: teacher.assignedClassIds } } },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          totalStudents: { $sum: "$studentCount" },
        },
      },
    ]);

    const dashboardData = {
      teacher: {
        name: teacher.userId?.profile?.name,
        employeeId: teacher.metadata?.employeeId,
        department: teacher.metadata?.department,
        subjects: teacher.metadata?.subjects,
      },
      school: teacher.schoolId,
      classes: teacher.assignedClassIds,
      statistics: classStats[0] || { totalClasses: 0, totalStudents: 0 },
    };

    res.json({
      success: true,
      dashboard: dashboardData,
    });
  } catch (error) {
    console.error("Get teacher dashboard error:", error);
    next(error);
  }
};

// Change teacher password
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find teacher by userId
    const teacher = await Teacher.findOne({ userId });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Verify current password using Teacher model's password field
    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash and update password in Teacher model
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    teacher.password = hashedNewPassword;
    await teacher.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    next(error);
  }
};
