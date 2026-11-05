const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function register(req, res) {
  try {
    const { full_name, email, password } = req.body;

    // Check required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required.",
      });
    }

    // Check password length
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (role is always customer for public registration)
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, full_name, email, role, created_at`,
      [full_name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Registration successful.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const result = await pool.query(
      `SELECT
        id,
        full_name,
        email,
        password_hash,
        role,
        preferred_cinema,
        paid_tickets_count
      FROM users
      WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    // Compare submitted password with stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Send JWT through HttpOnly Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        preferred_cinema: user.preferred_cinema,
        paid_tickets_count: user.paid_tickets_count,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        full_name,
        email,
        role,
        preferred_cinema,
        paid_tickets_count,
        created_at
      FROM users
      WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}

async function updateProfile(req, res) {
  try {
    const { full_name, email, preferred_cinema } = req.body;

    if (!full_name?.trim() || !email?.trim() || !preferred_cinema) {
      return res.status(400).json({
        message: "Full name, email and preferred cinema are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = full_name.trim();

    if (!["Oulu", "Tampere"].includes(preferred_cinema)) {
      return res.status(400).json({
        message: "Invalid preferred cinema.",
      });
    }

    const existingUser = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(email) = $1 AND id != $2`,
      [normalizedEmail, req.user.userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           email = $2,
           preferred_cinema = $3
       WHERE id = $4
       RETURNING id, full_name, email, role,
                 preferred_cinema, paid_tickets_count, created_at`,
      [
        normalizedName,
        normalizedEmail,
        preferred_cinema,
        req.user.userId,
      ]
    );

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Unable to update profile.",
    });
  }
}


async function changePassword(req, res) {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    // Check required fields
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        message: "Please fill in all password fields.",
      });
    }

    // Check new password length
    if (new_password.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long.",
      });
    }

    // Check password confirmation
    if (new_password !== confirm_password) {
      return res.status(400).json({
        message: "New passwords do not match.",
      });
    }

    // Get current password hash
    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    // Prevent using the same password
    const isSamePassword = await bcrypt.compare(
      new_password,
      result.rows[0].password_hash
    );

    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password.",
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newPasswordHash, req.user.userId]
    );

    return res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "Unable to change password.",
    });
  }
}

async function deleteAccount(req, res) {
  const client = await pool.connect();

  try {
    const { current_password } = req.body;

    if (!current_password) {
      return res.status(400).json({
        message: "Please enter your current password.",
      });
    }

    const result = await client.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    await client.query("BEGIN");

    await client.query(
      "DELETE FROM users WHERE id = $1",
      [req.user.userId]
    );

    await client.query("COMMIT");

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "Account deleted successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Delete account error:", error);

    return res.status(500).json({
      message: "Unable to delete account.",
    });
  } finally {
    client.release();
  }
}


function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({
    message: "Logout successful.",
  });
}


module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
};