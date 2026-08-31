const express = require('express');
const router = express.Router();
const { createContent, getAllContent, getContentById, updateContent, deleteContent } = require('../controllers/educationController');
const { protect } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', getAllContent);
router.get('/:id', getContentById);
router.post('/', protect, roleCheck('admin', 'hospital', 'volunteer'), createContent);
router.put('/:id', protect, roleCheck('admin', 'hospital', 'volunteer'), updateContent);
router.delete('/:id', protect, roleCheck('admin', 'volunteer'), deleteContent);

module.exports = router;
