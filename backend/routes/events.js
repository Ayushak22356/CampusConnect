const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getEvents, getEventById, createEvent, updateEvent, deleteEvent, getMyEvents
} = require('../controllers/eventController');

router.get('/', getEvents);
router.get('/my', authenticate, getMyEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, authorize('organizer', 'faculty', 'admin'), createEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

module.exports = router;