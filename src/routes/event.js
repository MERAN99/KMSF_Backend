const express = require('express');
const router = express.Router();
const { getEvents, getEvent, getEventPdf } = require('../controllers/eventController');

router.get('/', getEvents);
router.get('/:id/pdf', getEventPdf);
router.get('/:id', getEvent);

module.exports = router;
