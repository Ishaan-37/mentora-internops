// debugAssignment.js
// Run from backend folder: node debugAssignment.js
// Shows exact data state for Shankar's assignments

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // 1. Find Shankar's users.id
    const { rows: shankar } = await pool.query(
      "SELECT id, name, email, role, is_active FROM users WHERE email ILIKE '%shankar%'"
    );
    console.log('\n=== Shankar in users table ===');
    console.table(shankar);

    if (!shankar.length) { console.log('Shankar not found!'); return; }
    const shankarId = shankar[0].id;

    // 2. Check mentors_interns — what interns are linked to Shankar?
    const { rows: links } = await pool.query(
      `SELECT mi.mentor_id, mi.intern_id, u.name AS intern_name, u.email AS intern_email
       FROM mentors_interns mi
       JOIN users u ON u.id = mi.intern_id
       WHERE mi.mentor_id = $1`,
      [shankarId]
    );
    console.log('\n=== mentors_interns rows for Shankar ===');
    console.table(links);

    // 3. Check internships — what does mentor_id say?
    const { rows: internships } = await pool.query(
      `SELECT i.intern_id, i.mentor_id, i.status, u_i.name AS intern_name, u_m.name AS mentor_name
       FROM internships i
       JOIN users u_i ON u_i.id = i.intern_id
       JOIN users u_m ON u_m.id = i.mentor_id
       WHERE i.status = 'active'`
    );
    console.log('\n=== Active internships ===');
    console.table(internships);

    // 4. Check what getMyInterns would return for Shankar
    const { rows: result } = await pool.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN internships i ON i.intern_id = u.id AND i.status = 'active'
       WHERE u.role = 'intern' AND u.is_active = TRUE AND i.mentor_id = $1`,
      [shankarId]
    );
    console.log('\n=== What getMyInterns returns for Shankar ===');
    console.table(result);
    if (!result.length) {
      console.log('❌ internships.mentor_id does NOT match Shankar\'s users.id');
      console.log('   Shankar\'s users.id:', shankarId);
    } else {
      console.log('✅ Assignment is correct in DB');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
})();
