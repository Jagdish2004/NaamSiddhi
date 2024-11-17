const express = require('express');
const router = express.Router();
const recordController = require("../controllers/recordController");

router.get("/" ,recordController.createRecord);

module.exports = router;