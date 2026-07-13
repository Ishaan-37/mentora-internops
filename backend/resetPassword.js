// resetPassword.js
// Run from the backend folder: node resetPassword.js
// Resets Shankar Behera's password to Mentor@1234

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const hash = await bcrypt.hash('Mentor@1234', 10);
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = 'shankar@iitjammu.ac.in'",
      [hash]
    );
    if (result.rowCount === 0) {
      console.log('❌ User not found. Check the email address.');
    } else {
      console.log('✅ Done! Password reset to: Mentor@1234');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
