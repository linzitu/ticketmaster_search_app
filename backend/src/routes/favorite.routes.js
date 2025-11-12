// backend/src/routes/favorite.routes.js
import express from 'express';
import { connectToDB } from '../db.js';

const router = express.Router();

/**
 * GET /api/favorites
 */
router.get('/', async (req, res) => {
    try {
        const db = await connectToDB();   // ✅ 确保已连接
        const favorites = await db
            .collection('favorites')
            .find({})
            .sort({ createdAt: 1 })
            .toArray();

        res.json(favorites);
    } catch (err) {
        console.error('Error fetching favorites:', err);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

/**
 * POST /api/favorites
 */
router.post('/', async (req, res) => {
    try {
        const db = await connectToDB();   // ✅ 确保已连接
        const item = req.body;

        if (!item || !item.id) {
            return res.status(400).json({ error: 'Missing event id in body' });
        }

        await db.collection('favorites').updateOne(
            { id: item.id },
            {
                $set: {
                    ...item,
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { upsert: true }
        );

        res.status(201).json({ message: 'Added to favorites' });
    } catch (err) {
        console.error('Error adding favorite:', err);
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

/**
 * DELETE /api/favorites/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const db = await connectToDB();   // ✅ 确保已连接
        const id = req.params.id;

        const result = await db.collection('favorites').deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Favorite not found' });
        }

        res.json({ message: 'Removed from favorites' });
    } catch (err) {
        console.error('Error removing favorite:', err);
        res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

export default router;
