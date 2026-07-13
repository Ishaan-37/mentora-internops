// resetInterns.js
// Run from backend folder: node resetInterns.js
// Resets passwords for both interns + reactivates Ankit

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const hash = await bcrypt.hash('Intern@1234', 10);

    // Reset Ishaan
    const r1 = await pool.query(
      `UPDATE users SET password_hash = $1, is_active = TRUE
       WHERE email = 'ishaan.23bsa10190@vitbhopal.ac.in'`,
      [hash]
    );
    console.log(r1.rowCount ? '✅ Ishaan reset → Intern@1234' : '❌ Ishaan not found');

    // Reactivate + reset Ankit
    const r2 = await pool.query(
      `UPDATE users SET password_hash = $1, is_active = TRUE
       WHERE email = 'ankit.verma2026@iitjammu.ac.in'`,
      [hash]
    );
    console.log(r2.rowCount ? '✅ Ankit reactivated + reset → Intern@1234' : '❌ Ankit not found');

    console.log('\nLogin credentials:');
    console.log('  Ishaan: ishaan.23bsa10190@vitbhopal.ac.in / Intern@1234');
    console.log('  Ankit:  ankit.verma2026@iitjammu.ac.in  / Intern@1234');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
