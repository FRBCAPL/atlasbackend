const express = require('express');
const proposalRoutes = require('./proposals');
const userRoutes = require('./users');
const matchRoutes = require('./matches');
const noteRoutes = require('./notes');

const router = express.Router();

router.use('/proposals', proposalRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/notes', noteRoutes);

module.exports = router; 