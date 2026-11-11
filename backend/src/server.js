require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");
const { expireExpiredBookings } = require("./services/bookingExpirationService");

const PORT = process.env.PORT || 3000;
let expirationJobRunning = false;

async function runExpirationJob() {
  if (expirationJobRunning) return;

  expirationJobRunning = true;
  try {
    const expiredCount = await expireExpiredBookings(100);
    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} booking(s).`);
    }
  } catch (error) {
    console.error("Failed to expire bookings:", error.message);
  } finally {
    expirationJobRunning = false;
  }
}

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connection successful!");

    // Run once on startup, then every minute.
    await runExpirationJob();
    setInterval(runExpirationJob, 60 * 1000);

    app.listen(PORT, () => {
      console.log(`RIO Cinema Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
