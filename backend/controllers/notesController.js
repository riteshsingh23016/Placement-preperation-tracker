const Note = require("../models/notes");
const Collection = require("../models/collection");

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).populate("collectionId").sort({ updatedAt: -1 }).lean().exec();
    return res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notes.",
    });
  }
};

exports.createNote = async (req, res) => {
  try {
    let { title, content, collectionId } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    if (!collectionId) {
      const generalCol = await Collection.findOne({ name: "General", user: req.user._id });
      if (generalCol) {
        collectionId = generalCol._id;
      }
    }

    const doc = await Note.create({
      title,
      content,
      collectionId,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: doc,
      message: "Note created.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not create note.",
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, content, collectionId } = req.body;

    if (!collectionId) {
      const generalCol = await Collection.findOne({ name: "General", user: req.user._id });
      if (generalCol) {
        collectionId = generalCol._id;
      }
    }

    const doc = await Note.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title, content, collectionId },
      { new: true, runValidators: true }
    ).populate("collectionId").lean().exec();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
      message: "Note updated.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not update note.",
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Note.findOneAndDelete({ _id: id, user: req.user._id }).lean().exec();
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {},
      message: "Note removed.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not delete note.",
    });
  }
};
