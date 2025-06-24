const express = require('express');
const router = express.Router();
const { getAllMatches, getCompletedMatches, create, markMatchCompleted } = require('../controllers/matchController');

router.get('/all-matches', getAllMatches);
router.get('/completed-matches', getCompletedMatches);
router.post('/', create);
router.patch('/completed/:id', markMatchCompleted);

module.exports = router; 