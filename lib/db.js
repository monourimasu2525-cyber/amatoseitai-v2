import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDb() {
  const pool = getPool();
  const check = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='sales' AND column_name='user_id'
  `);
  if (check.rows.length === 0) {
    await pool.query(`
      DROP TABLE IF EXISTS sales CASCADE;
      DROP TABLE IF EXISTS master_items CASCADE;
    `);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      input_method VARCHAR(30) DEFAULT 'WebApp'
    );
    CREATE TABLE IF NOT EXISTS master_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sales_user_created ON sales(user_id, created_at);
  `);
}
