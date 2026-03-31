const db = require('../config/db');

const rsvpEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId  = req.user.id;

    const [events] = await db.query(
      'SELECT * FROM events WHERE id = ? AND status = "published"',
      [eventId]
    );
    if (events.length === 0)
      return res.status(404).json({ success: false, message: 'Event not found or not available.' });

    const event = events[0];

    if (event.registration_deadline && new Date() > new Date(event.registration_deadline))
      return res.status(400).json({ success: false, message: 'Registration deadline has passed.' });

    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status = "registered"',
      [eventId]
    );
    if (count >= event.max_capacity)
      return res.status(400).json({ success: false, message: 'Event is at full capacity.' });

    const [existing] = await db.query(
      'SELECT id, status FROM registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    if (existing.length > 0) {
      if (existing[0].status === 'registered')
        return res.status(409).json({ success: false, message: 'Already registered for this event.' });
      await db.query(
        'UPDATE registrations SET status = "registered" WHERE id = ?',
        [existing[0].id]
      );
      return res.json({ success: true, message: 'Registration restored.' });
    }

    await db.query(
      'INSERT INTO registrations (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );
    res.status(201).json({ success: true, message: 'Successfully registered for event!' });

  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const cancelRsvp = async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE registrations SET status = "cancelled" WHERE event_id = ? AND user_id = ? AND status = "registered"',
      [req.params.eventId, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'No active registration found.' });

    res.json({ success: true, message: 'Registration cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getMyRegistrations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.title, e.event_date, e.start_time, e.end_time,
             e.venue, e.status AS event_status,
             c.name AS category_name, c.color AS category_color,
             r.status AS rsvp_status, r.registered_at
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE r.user_id = ?
      ORDER BY e.event_date DESC
    `, [req.user.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getEventAttendees = async (req, res) => {
  try {
    const [event] = await db.query(
      'SELECT organizer_id FROM events WHERE id = ?',
      [req.params.eventId]
    );
    if (event.length === 0)
      return res.status(404).json({ success: false, message: 'Event not found.' });

    if (event[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const [attendees] = await db.query(`
      SELECT u.id, u.name, u.email, u.department, u.role,
             r.status AS rsvp_status, r.registered_at
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY r.registered_at DESC
    `, [req.params.eventId]);

    res.json({ success: true, data: attendees });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const markAttendance = async (req, res) => {
  try {
    await db.query(
      'UPDATE registrations SET status = "attended" WHERE event_id = ? AND user_id = ?',
      [req.params.eventId, req.params.userId]
    );
    res.json({ success: true, message: 'Attendance marked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  rsvpEvent,
  cancelRsvp,
  getMyRegistrations,
  getEventAttendees,
  markAttendance
};