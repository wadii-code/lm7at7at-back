const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Then increase the limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import and use routes
const productRoutes = require('./routes/products')(supabase);
const collectionRoutes = require('./routes/collections')(supabase);
const orderRoutes = require('./routes/orders')(supabase);
const authRoutes = require('./routes/auth')(supabase);
const reviewRoutes = require('./routes/reviews')(supabase);

app.use('/api/products', productRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});