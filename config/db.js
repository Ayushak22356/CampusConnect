const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('❌ SQLite connection failed:', err.message);
  } else {
    console.log('✅ SQLite connected successfully');
  }
});

module.exports = db;