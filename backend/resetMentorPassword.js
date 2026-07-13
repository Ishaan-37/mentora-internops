const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mentora',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

(async () => {
  const password = 'Mentor@123';
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `UPDATE users
     SET password_hash = $1
     WHERE email = 'shankar@iitjammu.ac.in'`,
    [hash]
  );

  console.log('Password reset successfully.');
  await pool.end();
})();