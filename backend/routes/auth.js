const express = require('express');
const router = express.Router();
const { register, login, getMe, updatePassword, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.delete('/me', protect, deleteAccount);
router.put('/password', protect, updatePassword);

module.exports = router;
