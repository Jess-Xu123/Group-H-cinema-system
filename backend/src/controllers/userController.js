const pool = require("../config/db");

// GET /api/users/statistics
async function getUserStatistics(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::INTEGER AS total_users,
        COUNT(*) FILTER (WHERE role = 'customer')::INTEGER AS customers,
        COUNT(*) FILTER (WHERE role = 'staff')::INTEGER AS staff,
        COUNT(*) FILTER (WHERE role = 'admin')::INTEGER AS admins,
        COUNT(*) FILTER (WHERE preferred_cinema = 'Oulu')::INTEGER AS oulu_users,
        COUNT(*) FILTER (WHERE preferred_cinema = 'Tampere')::INTEGER AS tampere_users
      FROM users
    `);

    return res.status(200).json({
      statistics: result.rows[0],
    });
  } catch (error) {
    console.error("Get user statistics error:", error);

    return res.status(500).json({
      message: "Failed to retrieve user statistics.",
    });
  }
}

// GET /api/users
async function getUsers(req, res) {
  try {
    const {
      search = "",
      role = "",
      cinema = "",
      page = "1",
      limit = "10",
    } = req.query;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );
    const offset = (currentPage - 1) * pageSize;

    const conditions = [];
    const values = [];

    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;

      conditions.push(`
        (
          full_name ILIKE $${searchIndex}
          OR email ILIKE $${searchIndex}
          OR id::TEXT = $${searchIndex}
        )
      `);
    }

    if (role) {
      if (!["customer", "staff", "admin"].includes(role)) {
        return res.status(400).json({
          message: "Invalid role filter.",
        });
      }

      values.push(role);
      conditions.push(`role = $${values.length}`);
    }

    if (cinema) {
      if (!["Oulu", "Tampere"].includes(cinema)) {
        return res.status(400).json({
          message: "Invalid cinema filter.",
        });
      }

      values.push(cinema);
      conditions.push(`preferred_cinema = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM users
        ${whereClause}
      `,
      values
    );

    const totalUsers = countResult.rows[0].total;

    const listValues = [...values, pageSize, offset];

    const result = await pool.query(
      `
        SELECT
          id,
          full_name,
          email,
          role,
          paid_tickets_count,
          created_at,
          preferred_cinema
        FROM users
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${listValues.length - 1}
        OFFSET $${listValues.length}
      `,
      listValues
    );

    return res.status(200).json({
      users: result.rows,
      pagination: {
        currentPage,
        pageSize,
        totalUsers,
        totalPages: Math.ceil(totalUsers / pageSize),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Failed to retrieve users.",
    });
  }
}

// GET /api/users/:id
async function getUserById(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          full_name,
          email,
          role,
          paid_tickets_count,
          created_at,
          preferred_cinema
        FROM users
        WHERE id = $1
      `,
      [userId]
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
    console.error("Get user details error:", error);

    return res.status(500).json({
      message: "Failed to retrieve user details.",
    });
  }
}

// PATCH /api/users/:id/role
async function updateUserRole(req, res) {
  const userId = Number(req.params.id);
  const { role } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID.",
    });
  }

  if (!["customer", "staff", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Role must be customer, staff, or admin.",
    });
  }

  // Prevent an admin from changing their own role.
  if (userId === Number(req.user.userId)) {
    return res.status(400).json({
      message: "You cannot change your own role.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock admin rows to prevent concurrent demotion
    // of the last remaining administrator.
    const adminResult = await client.query(`
      SELECT id
      FROM users
      WHERE role = 'admin'
      FOR UPDATE
    `);

    const targetResult = await client.query(
      `
        SELECT id, role
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (targetResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "User not found.",
      });
    }

    const currentRole = targetResult.rows[0].role;

    if (
      currentRole === "admin" &&
      role !== "admin" &&
      adminResult.rows.length <= 1
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Cannot demote the last administrator.",
      });
    }

    const result = await client.query(
      `
        UPDATE users
        SET role = $1
        WHERE id = $2
        RETURNING
          id,
          full_name,
          email,
          role,
          paid_tickets_count,
          created_at,
          preferred_cinema
      `,
      [role, userId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "User role updated successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update user role error:", error);

    return res.status(500).json({
      message: "Failed to update user role.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getUserStatistics,
  getUsers,
  getUserById,
  updateUserRole,
};
