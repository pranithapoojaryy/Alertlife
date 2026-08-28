const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventById, registerForEvent, updateEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', protect, roleCheck('admin', 'hospital'), createEvent);
router.post('/:id/register', protect, registerForEvent);
router.put('/:id', protect, roleCheck('admin', 'hospital'), updateEvent);

module.exports = router;
