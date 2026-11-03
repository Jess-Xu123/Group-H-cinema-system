import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

export default pool;