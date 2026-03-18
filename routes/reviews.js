const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to get user ID from token (optional)
const getUserId = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return decoded.id;
        } catch (error) {
            return null;
        }
    }
    return null;
};

module.exports = (supabase) => {
    // Fetch reviews for a product
    router.get('/:productId', async (req, res) => {
        const { productId } = req.params;
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    user:users (
                        id,
                        name
                    )
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
        }
    });

    // Add a review for a product
    router.post('/:productId', async (req, res) => {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'You must be logged in to post a review.' });
        }

        const { productId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || !comment) {
            return res.status(400).json({ message: 'Please provide a rating and a comment.' });
        }

        try {
            const { data: newReview, error } = await supabase
                .from('reviews')
                .insert([
                    { product_id: productId, user_id: userId, rating, comment }
                ])
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    user:users (
                        id,
                        name
                    )
                `)
                .single();

            if (error) throw error;
            res.status(201).json(newReview);
        } catch (error) {
            res.status(500).json({ message: 'Failed to add review', error: error.message });
        }
    });

    return router;
};