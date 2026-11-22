const fs = require("fs");
const path = require("path");

// These migrations are already present in the deployed database.
const BASELINED_MIGRATIONS = [
  "001_booking_reservation_history.sql",
  "002_stripe_payment.sql",
  "003_create_system_settings.sql",
  "004_private_screening_enquires.sql",
  "005_private_booking_review_info.sql",
];
const MIGRATION_LOCK_KEY = 20261122;

async function runMigrations(pool) {
  const migrationsDir = path.join(__dirname, "../../sql/migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [
      MIGRATION_LOCK_KEY,
    ]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(
      `INSERT INTO schema_migrations (filename)
       SELECT baseline.filename
       FROM unnest($1::text[]) AS baseline(filename)
       ON CONFLICT (filename) DO NOTHING`,
      [BASELINED_MIGRATIONS],
    );
    await client.query("COMMIT");

    for (const file of files) {
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [
          MIGRATION_LOCK_KEY,
        ]);
        const { rows } = await client.query(
          "SELECT 1 FROM schema_migrations WHERE filename = $1",
          [file],
        );
        if (rows.length > 0) {
          await client.query("COMMIT");
          continue;
        }

        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        // Migration files run inside this transaction and must not add BEGIN/COMMIT.
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log(`[Migration] Applied: ${file}`);
      } catch (err) {
        console.error(`[Migration] Failed on ${file}:`, err);
        throw err;
      }
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
