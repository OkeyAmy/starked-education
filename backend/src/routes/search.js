const express = require('express');
const { discoveryService } = require('../services/discoveryService');
const { readLimiter, searchWriteLimiter } = require('../middleware/rateLimiter');

const createSearchRouter = (service = discoveryService) => {
    const router = express.Router();
    const Joi = require('joi');
    const { validateRequestSchema } = require('../middleware/validateRequestSchema');

    const voiceSearchSchema = {
      body: Joi.object({
        transcript: Joi.string().trim().min(1).max(5000).optional(),
        query: Joi.string().trim().min(1).max(5000).optional(),
        filters: Joi.object().optional(),
        userId: Joi.string().trim().optional(),
        sessionId: Joi.string().trim().optional(),
      }).min(1)
    };

    const saveSearchSchema = {
      body: Joi.object({
        userId: Joi.string().trim().optional(),
        sessionId: Joi.string().trim().optional(),
      })
    };

    const createAlertSchema = {
      body: Joi.object({
        userId: Joi.string().trim().optional(),
        sessionId: Joi.string().trim().optional(),
      })
    };

    const clickSchema = {
      body: Joi.object({
        userId: Joi.string().trim().optional(),
        sessionId: Joi.string().trim().optional(),
      })
    };

    router.get('/', readLimiter, (req, res) => {
        try {
            const result = service.search({
                query: req.query.q || req.query.query || '',
                filters: req.query,
                userId: req.query.userId,
                sessionId: req.query.sessionId
            });

            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to execute search', error: error.message });
        }
    });

    router.get('/suggestions', readLimiter, (req, res) => {
        try {
            const sessionKey = service.getUserSessionKey(req.query.userId, req.query.sessionId);
            const suggestions = service.getSuggestions(req.query.q || req.query.query || '', sessionKey, Number(req.query.limit) || 6);
            res.json({ success: true, data: { suggestions } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load suggestions', error: error.message });
        }
    });

    router.post('/voice', searchWriteLimiter, validateRequestSchema(voiceSearchSchema), (req, res) => {
        try {
            const normalizedQuery = service.normalizeVoiceQuery(req.body.transcript || req.body.query || '');
            const result = service.search({
                query: normalizedQuery,
                filters: req.body.filters || {},
                userId: req.body.userId,
                sessionId: req.body.sessionId
            });

            res.json({ success: true, data: { normalizedQuery, result } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to process voice query', error: error.message });
        }
    });

    router.get('/recommendations', readLimiter, (req, res) => {
        try {
            const data = service.getRecommendations(req.query.userId, req.query.sessionId, Number(req.query.limit) || 6);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load recommendations', error: error.message });
        }
    });

    router.get('/trending', readLimiter, (req, res) => {
        try {
            res.json({ success: true, data: service.getTrending(Number(req.query.limit) || 6) });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load trending content', error: error.message });
        }
    });

    router.get('/similar/:courseId', readLimiter, (req, res) => {
        try {
            const data = service.getSimilar(req.params.courseId, Number(req.query.limit) || 4);

            if (!data) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }

            return res.json({ success: true, data });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to load similar content', error: error.message });
        }
    });

    router.get('/learning-paths', readLimiter, (req, res) => {
        try {
            const data = service.getLearningPaths(req.query.q || req.query.query || '', req.query.userId, req.query.sessionId, Number(req.query.limit) || 4);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load learning paths', error: error.message });
        }
    });

    router.get('/curators', readLimiter, (req, res) => {
        try {
            res.json({ success: true, data: service.getCuratorRecommendations(Number(req.query.limit) || 3) });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load curator picks', error: error.message });
        }
    });

    router.get('/history', readLimiter, (req, res) => {
        try {
            const items = service.getSearchHistory(req.query.userId, req.query.sessionId);
            res.json({ success: true, data: { items } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load search history', error: error.message });
        }
    });

    router.get('/saved-searches', readLimiter, (req, res) => {
        try {
            const items = service.getSavedSearches(req.query.userId, req.query.sessionId);
            res.json({ success: true, data: { items } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load saved searches', error: error.message });
        }
    });

    router.post('/saved-searches', searchWriteLimiter, validateRequestSchema(saveSearchSchema), (req, res) => {
        try {
            const item = service.saveSearch(req.body.userId, req.body.sessionId, req.body);
            res.status(201).json({ success: true, data: item });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to save search', error: error.message });
        }
    });

    router.get('/alerts', readLimiter, (req, res) => {
        try {
            const items = service.getAlerts(req.query.userId, req.query.sessionId);
            res.json({ success: true, data: { items } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load search alerts', error: error.message });
        }
    });

    router.post('/alerts', searchWriteLimiter, validateRequestSchema(createAlertSchema), (req, res) => {
        try {
            const item = service.createAlert(req.body.userId, req.body.sessionId, req.body);
            res.status(201).json({ success: true, data: item });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create alert', error: error.message });
        }
    });

    router.post('/click', searchWriteLimiter, validateRequestSchema(clickSchema), (req, res) => {
        try {
            const data = service.recordClick(req.body.userId, req.body.sessionId, req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to record search click', error: error.message });
        }
    });

    router.get('/analytics', readLimiter, (req, res) => {
        try {
            res.json({ success: true, data: service.getAnalytics() });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to load search analytics', error: error.message });
        }
    });

    return router;
};

module.exports = createSearchRouter;
module.exports.createSearchRouter = createSearchRouter;
