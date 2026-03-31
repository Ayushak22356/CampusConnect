const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  rsvpEvent,
  cancelRsvp,
  getMyRegistrations,
  getEventAttendees,
  markAttendance
} = require('../controllers/registrationController');

router.post('/rsvp/:eventId',      authenticate, rsvpEvent);
router.delete('/cancel/:eventId',  authenticate, cancelRsvp);
router.get('/my-events',           authenticate, getMyRegistrations);
router.get('/event/:eventId',      authenticate, getEventAttendees);
router.put('/attendance/:eventId/:userId', authenticate, authorize('organizer', 'admin'), markAttendance);

module.exports = router;