const express = require("express");

const {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getCollections)
  .post(createCollection);

router
  .route("/:id")
  .put(updateCollection)
  .delete(deleteCollection);

module.exports = router;