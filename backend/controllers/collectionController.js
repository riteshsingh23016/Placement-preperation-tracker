const Collection = require("../models/collection");
const Note = require("../models/notes");

exports.getCollections = async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: collections });
  } catch (err) {
    console.error("[Collection] Get Collections Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch collections" });
  }
};

exports.createCollection = async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Collection name is required" });
    }

    const collection = await Collection.create({
      name: name.trim(),
      color: color || "muted",
      icon: icon || "folder",
      user: req.user._id,
    });

    res.status(201).json({ success: true, data: collection });
  } catch (err) {
    console.error("[Collection] Create Collection Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to create collection" });
  }
};

exports.updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    const collection = await Collection.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { name, color, icon },
      { new: true, runValidators: true }
    );

    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    res.status(200).json({ success: true, data: collection });
  } catch (err) {
    console.error("[Collection] Update Collection Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update collection" });
  }
};

exports.deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await Collection.findOne({ _id: id, user: req.user._id });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    if (collection.name === "General") {
      return res.status(400).json({ success: false, message: "Cannot delete the General collection" });
    }

    // Fallback notes to "General"
    const generalCol = await Collection.findOne({ name: "General", user: req.user._id });
    if (generalCol) {
      await Note.updateMany(
        { collectionId: collection._id, user: req.user._id },
        { collectionId: generalCol._id }
      );
    }

    await collection.deleteOne();

    res.status(200).json({ success: true, message: "Collection deleted and notes moved to General" });
  } catch (err) {
    console.error("[Collection] Delete Collection Error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete collection" });
  }
};
