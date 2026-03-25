const express = require('express');
const router = express.Router();
const { createReview } = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');

router.post('/', auth, createReview);

module.exports = router;
