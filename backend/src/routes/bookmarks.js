const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Note = require('../models/Note');
const Content = require('../models/Content');
const { authenticateToken: auth } = require('../middleware/auth');
const Joi = require('joi');
const { validateRequestSchema } = require('../middleware/validateRequestSchema');

const createBookmarkSchema = {
  body: Joi.object({
    contentId: Joi.string().trim().min(1).required(),
    timestamp: Joi.number().min(0).required(),
    note: Joi.string().max(2000).optional(),
  })
};

const deleteBookmarkSchema = {
  params: Joi.object({
    bookmarkId: Joi.string().trim().min(1).required(),
  })
};

const createNoteSchema = {
  body: Joi.object({
    contentId: Joi.string().trim().min(1).required(),
    timestamp: Joi.number().min(0).optional(),
    text: Joi.string().trim().min(1).max(10000).required(),
    isPrivate: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  })
};

const updateNoteSchema = {
  params: Joi.object({
    noteId: Joi.string().trim().min(1).required(),
  }),
  body: Joi.object({
    text: Joi.string().trim().min(1).max(10000).optional(),
    isPrivate: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }).min(1)
};

const deleteNoteSchema = {
  params: Joi.object({
    noteId: Joi.string().trim().min(1).required(),
  })
};

// Get all bookmarks for a user
router.get('/', auth, async (req, res) => {
  try {
    const { contentId } = req.query;
    let query = { user: req.user.id };
    
    if (contentId) {
      query.content = contentId;
    }
    
    const bookmarks = await Bookmark.find(query)
      .populate('content', 'title type duration')
      .sort({ createdAt: -1 });
    
    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update bookmark
router.post('/', auth, validateRequestSchema(createBookmarkSchema), async (req, res) => {
  try {
    const { contentId, timestamp, note } = req.body;
    
    // Validate content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Validate timestamp
    if (timestamp < 0 || (content.duration && timestamp > content.duration)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    
    const bookmark = await Bookmark.findOneAndUpdate(
      { user: req.user.id, content: contentId },
      { 
        timestamp, 
        note: note || '',
        createdAt: new Date()
      },
      { 
        new: true, 
        upsert: true 
      }
    ).populate('content', 'title type duration');
    
    res.json(bookmark);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Bookmark already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete bookmark
router.delete('/:bookmarkId', auth, validateRequestSchema(deleteBookmarkSchema), async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.bookmarkId,
      user: req.user.id
    });
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all notes for a user
router.get('/notes', auth, async (req, res) => {
  try {
    const { contentId, tags } = req.query;
    let query = { user: req.user.id };
    
    if (contentId) {
      query.content = contentId;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    const notes = await Note.find(query)
      .populate('content', 'title type duration')
      .sort({ createdAt: -1 });
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create note
router.post('/notes', auth, validateRequestSchema(createNoteSchema), async (req, res) => {
  try {
    const { contentId, timestamp, text, isPrivate, tags } = req.body;
    
    // Validate content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Validate timestamp
    if (timestamp < 0 || (content.duration && timestamp > content.duration)) {
      return res.status(400).json({ error: 'Invalid timestamp' });
    }
    
    const note = new Note({
      user: req.user.id,
      content: contentId,
      timestamp,
      text,
      isPrivate: isPrivate !== false,
      tags: tags || []
    });
    
    await note.save();
    await note.populate('content', 'title type duration');
    
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update note
router.put('/notes/:noteId', auth, validateRequestSchema(updateNoteSchema), async (req, res) => {
  try {
    const { text, isPrivate, tags } = req.body;
    
    const note = await Note.findOneAndUpdate(
      { _id: req.params.noteId, user: req.user.id },
      { 
        text, 
        isPrivate, 
        tags: tags || [],
        updatedAt: new Date()
      },
      { new: true }
    ).populate('content', 'title type duration');
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete note
router.delete('/notes/:noteId', auth, validateRequestSchema(deleteNoteSchema), async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.noteId,
      user: req.user.id
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
