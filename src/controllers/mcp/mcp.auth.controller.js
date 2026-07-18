// controllers/auth/mcp.auth.controller.js
// Special login endpoint for server-to-server MCP calls.
// Returns JWT token in JSON body instead of setting cookies,
// because MCP server cannot handle Set-Cookie cross-domain.

import bcrypt from "bcryptjs";
import { Auth } from "../../models/auth/auth.models.js";
import tokenGenerate from "../../utils/tokenGeneration.js";
import config from "../../config/config.js";
// import { Auth } from "../../models/auth/auth.models.js";
// import tokenGenerate from "../../utils/tokenGeneration.js";
// import config from "../../config/config.js";

export const mcpLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
      });
    }

    const user = await Auth.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() },
        { phone: identifier.trim() },
      ],
    }).select("_id email username phone password role isActive isVerified");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Account is not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

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

    // Return token in body (not cookie) — MCP server uses this as Bearer token
    return res.status(200).json({
      success: true,
      message: "MCP login successful",
      accessToken: token.accessToken,
    });
  } catch (error) {
    console.error("MCP Login Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};