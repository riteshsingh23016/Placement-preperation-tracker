const mongoose = require("mongoose");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Validators = require("../utils/validators");

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
    let { title, content, collectionId, pinned } = req.body;

    const titleErr = Validators.validateLongText(title, 100, "Title", true);
    if (titleErr) {
      return res.status(400).json({ success: false, message: titleErr });
    }

    const contentErr = Validators.validateLongText(content, 5000, "Content", true);
    if (contentErr) {
      return res.status(400).json({ success: false, message: contentErr });
    }

    title = title.trim();
    content = content.trim();

    const isValidCol = mongoose.Types.ObjectId.isValid(collectionId);
    if (!collectionId || !isValidCol) {
      const generalCol = await Collection.findOne({ isDefault: true, user: req.user._id }) || await Collection.findOne({ name: "General", user: req.user._id });
      if (generalCol) {
        collectionId = generalCol._id;
      } else {
        collectionId = undefined;
      }
    }

    const doc = await Note.create({
      title,
      content,
      collectionId,
      pinned: !!pinned,
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
    let { title, content, collectionId, pinned } = req.body;

    const updateFields = {};
    if (title !== undefined) {
      const titleErr = Validators.validateLongText(title, 100, "Title", true);
      if (titleErr) {
        return res.status(400).json({ success: false, message: titleErr });
      }
      updateFields.title = title.trim();
    }
    if (content !== undefined) {
      const contentErr = Validators.validateLongText(content, 5000, "Content", true);
      if (contentErr) {
        return res.status(400).json({ success: false, message: contentErr });
      }
      updateFields.content = content.trim();
    }
    if (pinned !== undefined) updateFields.pinned = !!pinned;

    if (req.body.hasOwnProperty("collectionId")) {
      const isValidCol = mongoose.Types.ObjectId.isValid(collectionId);
      if (!collectionId || !isValidCol) {
        const generalCol = await Collection.findOne({ isDefault: true, user: req.user._id }) || await Collection.findOne({ name: "General", user: req.user._id });
        if (generalCol) {
          updateFields.collectionId = generalCol._id;
        }
      } else {
        updateFields.collectionId = collectionId;
      }
    }

    const doc = await Note.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updateFields,
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
