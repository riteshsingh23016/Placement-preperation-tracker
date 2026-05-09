const express = require("express");
const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getCompanies).post(protect, createCompany);
router.route("/:id").put(protect, updateCompany).delete(protect, deleteCompany);

module.exports = router;
