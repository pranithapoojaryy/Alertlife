const express = require('express');
const router = express.Router();
const { createContent, getAllContent, getContentById, updateContent, deleteContent } = require('../controllers/educationController');
const { optionalProtect } = require('../middleware/auth');

router.get('/', getAllContent);
router.get('/:id', getContentById);
router.post('/', optionalProtect, createContent);
router.put('/:id', optionalProtect, updateContent);
router.delete('/:id', optionalProtect, deleteContent);

module.exports = router;

