import bcrypt from "bcryptjs";
import { generateOTP } from "../../utils/OTPGenerator.js";
import { Auth } from "../../models/auth/auth.models.js";
import tokenGenerate from "../../utils/tokenGeneration.js";
import config from "../../config/config.js";
import cookieParser  from "cookie-parser";

export const createAccount = async (req, res) => {
  try {
    const {
      name,
      email,
      username,
      phone,
      password,
      role,
    } = req.body;

    // ==========================================
    // Required Fields Validation
    // ==========================================
    const requiredFields = {
      name,
      email,
      username,
      phone,
      password,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || String(value).trim() === "") {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    // ==========================================
    // Password Validation
    // ==========================================
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and special character",
      });
    }

    // ==========================================
    // Duplicate Check
    // ==========================================
    const existingUser = await Auth.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: username.trim() },
        { phone: phone.trim() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.trim().toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (existingUser.username === username.trim()) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      if (existingUser.phone === phone.trim()) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    // ==========================================
    // Hash Password
    // ==========================================
    const hashedPassword = await bcrypt.hash(password, 12);

    // ==========================================
    // Generate & Hash OTP
    // ==========================================
    const otp = generateOTP().toString();

    const hashOTP = await bcrypt.hash(otp, 10);

    const otpExpiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Remove in production
    console.log("Email OTP:", otp);

    // ==========================================
    // Create User
    // ==========================================
    const user = new Auth({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim(),
      phone: phone.trim(),
      password: hashedPassword,

      role: role || "user",

      isActive: true,
      isVerified: false,

      verification: {
        emailOtp: hashOTP,
        emailOtpExpires: otpExpiry,
        phoneOtp: hashOTP,
        phoneOtpExpires: otpExpiry,
      },
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error(error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};


// login account 
export const loginAccountWithPassword = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // ==============================
    // Validation
    // ==============================
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
      });
    }

    // ==============================
    // Find User
    // ==============================
    const user = await Auth.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
        { phone: identifier.trim() },
      ],
    }).select(
      "_id email username phone password role isActive isVerified"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==============================
    // Account Status Checks
    // ==============================
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Account is not verified",
      });
    }

    // ==============================
    // Password Check
    // ==============================
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ==============================
    // Generate Tokens
    // ==============================
 const token = tokenGenerate({
  id: user._id,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  isActive: user.isActive,
  accessSecret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
});
    // ==============================
    // Set Cookies
    // ==============================
 res.cookie("accessToken", token.accessToken, {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 60 * 60 * 1000*24,
});

res.cookie("refreshToken", token.refreshToken, {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 60 * 60 * 1000*24,
});

    // ==============================
    // Response
    // ==============================
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Internal Server Error",
    });
  }
};


// Verify OTP
  
// auto generate access token after 15 minus

// get me
export const getMe = async (req, res) => {
try {
  const user = req.user;
  if(!user) return res.status(401).json({message:"Unauthorized",success:false})
console.log("user",user)
    // is User exits
    const isUser = await Auth.findById(user.id).select("-password");
    if(!isUser) return res.status(404).json({message:"User not found",success:false})
return res.status(200).json({message:"User found",success:true,data:isUser})
    

  
} catch (error) {
  return res.status(500).json({message:error.message,success:false})

}
} 


export const logoutUser = async (req, res) => {
    try {
        // IMPORTANT: yeh exact same options hone chahiye jo login/signin ke
        // waqt cookie set karte time diye gaye the — naam, path, domain match
        // hona zaroori hai, warna browser cookie clear nahi karega.
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        };

        res.clearCookie("accessToken", cookieOptions);
        res.clearCookie("refreshToken", cookieOptions);

        return res.status(200).json({
            message: "Logged out successfully",
            success: true,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message, success: false });
    }
};