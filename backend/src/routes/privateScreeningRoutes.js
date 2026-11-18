const express = require("express");
const router = express.Router();
const {
  createPrivateScreeningEnquiry,
} = require("../controllers/privateScreeningController");

// When receives POST request, handle to Controller
router.post("/", createPrivateScreeningEnquiry);

module.exports = router;
