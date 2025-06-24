const Note = require('../models/Note');

exports.getAll = async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.body.text || !req.body.text.trim()) {
      return res.status(400).json({ error: 'Note text required' });
    }
    const note = new Note({ text: req.body.text.trim() });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    console.error('Error saving note:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
};

exports.delete = async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
}; 