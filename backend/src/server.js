require("dotenv").config();

const app = require("./app");

const pool = require("./config/db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connection successful!");

    app.listen(PORT, () => {
      console.log(`RIO Cinema Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
}

startServer();