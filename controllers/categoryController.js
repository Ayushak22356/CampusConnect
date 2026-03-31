const db = require('../config/db');

const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const [result] = await db.query(
      'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
      [name, color || '#6366f1', icon || 'calendar']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getCategories, createCategory };