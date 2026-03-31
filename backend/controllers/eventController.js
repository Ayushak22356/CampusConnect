const db = require('../config/db');

// GET /api/events  — list with filters
const getEvents = async (req, res) => {
  try {
    const { category, status, search, upcoming } = req.query;
    let query = `
      SELECT e.*, u.name AS organizer_name, u.department AS organizer_dept,
             c.name AS category_name, c.color AS category_color,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS rsvp_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.is_public = TRUE
    `;
    const params = [];

    if (category) { query += ' AND e.category_id = ?'; params.push(category); }
    if (status)   { query += ' AND e.status = ?';      params.push(status); }
    if (upcoming) { query += ' AND e.event_date >= CURDATE()'; }
    if (search)   { query += ' AND (e.title LIKE ? OR e.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY e.event_date ASC';

    const [events] = await db.query(query, params);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, u.name AS organizer_name, u.email AS organizer_email, u.department AS organizer_dept,
             c.name AS category_name, c.color AS category_color,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS rsvp_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `, [req.params.id]);

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Event not found.' });

    const [agenda] = await db.query(
      'SELECT * FROM agenda_items WHERE event_id = ? ORDER BY order_index ASC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], agenda } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/events
const createEvent = async (req, res) => {
  try {
    const {
      title, description, category_id, venue, event_date, start_time,
      end_time, max_capacity, registration_deadline, is_public, tags, agenda
    } = req.body;

    if (!title || !description || !venue || !event_date || !start_time || !end_time)
      return res.status(400).json({ success: false, message: 'Required fields missing.' });

    const [result] = await db.query(
      `INSERT INTO events (title, description, category_id, organizer_id, venue, event_date,
        start_time, end_time, max_capacity, registration_deadline, is_public, tags, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [title, description, category_id || null, req.user.id, venue, event_date,
       start_time, end_time, max_capacity || 100, registration_deadline || null,
       is_public !== false, tags || null]
    );

    const eventId = result.insertId;

    // Insert agenda items if provided
    if (agenda && Array.isArray(agenda) && agenda.length > 0) {
      const agendaValues = agenda.map((item, idx) => [
        eventId, item.title, item.description || null, item.speaker || null,
        item.start_time, item.end_time, idx
      ]);
      await db.query(
        `INSERT INTO agenda_items (event_id, title, description, speaker, start_time, end_time, order_index)
         VALUES ?`, [agendaValues]
      );
    }

    res.status(201).json({ success: true, message: 'Event created successfully.', eventId });
  } catch (err) {
    console.error('createEvent error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Event not found.' });

    if (rows[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const {
      title, description, category_id, venue, event_date, start_time,
      end_time, max_capacity, registration_deadline, is_public, tags, status
    } = req.body;

    await db.query(
      `UPDATE events SET title=?, description=?, category_id=?, venue=?, event_date=?,
       start_time=?, end_time=?, max_capacity=?, registration_deadline=?, is_public=?, tags=?, status=?
       WHERE id=?`,
      [title, description, category_id, venue, event_date, start_time, end_time,
       max_capacity, registration_deadline, is_public, tags, status, req.params.id]
    );

    res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT organizer_id FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Event not found.' });

    if (rows[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/events/my — organizer's own events
const getMyEvents = async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT e.*, c.name AS category_name, c.color AS category_color,
             (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status='registered') AS rsvp_count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.organizer_id = ?
      ORDER BY e.event_date DESC
    `, [req.user.id]);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, getMyEvents };