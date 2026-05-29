const express = require('express');
const router = express.Router();
const { getTeamMembers } = require('../controllers/teamMemberController');

router.get('/', getTeamMembers);

module.exports = router;
