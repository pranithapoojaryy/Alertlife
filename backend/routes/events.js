const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventById, registerForEvent, updateEvent } = require('../controllers/eventController');
const { optionalProtect } = require('../middleware/auth');

router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', optionalProtect, createEvent);
router.post('/:id/register', optionalProtect, registerForEvent);
router.put('/:id', optionalProtect, updateEvent);

module.exports = router;

