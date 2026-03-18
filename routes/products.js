const express = require('express');
const router = express.Router();

// Helper function to convert camelCase to snake_case for Supabase
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const snakeObj = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = value;
  }
  return snakeObj;
};

// Helper function to convert snake_case to camelCase for frontend
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  
  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = value;
  }
  return camelObj;
};

module.exports = (supabase) => {
  // Fetch all products
  router.get('/', async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url),
        product_sizes(size),
        product_colors(name, name_ar, hex),
        product_tags(tag)
      `);

    if (error) return res.status(500).json({ error: error.message });

    // Transform the data to match frontend structure
    const transformedData = data.map(product => {
      const transformed = {
        id: product.id,
        name: product.name,
        nameAr: product.name_ar,
        description: product.description,
        descriptionAr: product.description_ar,
        price: product.price,
        originalPrice: product.original_price,
        images: product.product_images?.map(img => img.image_url) || [],
        thumbnail: product.thumbnail,
        category: product.category,
        subcategory: product.subcategory,
        sizes: product.product_sizes?.map(s => s.size) || [],
        colors: product.product_colors?.map(c => ({
          name: c.name,
          nameAr: c.name_ar,
          hex: c.hex
        })) || [],
        inStock: product.in_stock,
        stockQuantity: product.stock_quantity,
        rating: product.rating,
        reviewCount: product.review_count,
        tags: product.product_tags?.map(t => t.tag) || [],
        isNew: product.is_new,
        isBestseller: product.is_bestseller,
        isOnSale: product.is_on_sale,
        createdAt: product.created_at
      };
      return transformed;
    });

    res.json(transformedData);
  });

  router.post('/', async (req, res) => {
    try {
      const body = req.body;
      console.log('Received camelCase data:', body);

      // 1️⃣ Insert main product (convert camelCase to snake_case)
      const productData = {
        name: body.name,
        name_ar: body.nameAr,
        description: body.description,
        description_ar: body.descriptionAr,
        price: body.price,
        original_price: body.originalPrice,
        thumbnail: body.thumbnail,
        category: body.category,
        subcategory: body.subcategory || null,
        in_stock: body.inStock,
        stock_quantity: body.stockQuantity,
        rating: body.rating || 0,
        review_count: body.reviewCount || 0,
        is_new: body.isNew || false,
        is_bestseller: body.isBestseller || false,
        is_on_sale: body.isOnSale || false
      };

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (productError) {
        return res.status(500).json({ error: productError.message });
      }

      const productId = product.id;

      // 2️⃣ Insert images
      if (body.images?.length) {
        const images = body.images.map((img) => ({
          product_id: productId,
          image_url: img
        }));

        await supabase.from('product_images').insert(images);
      }

      // 3️⃣ Insert sizes
      if (body.sizes?.length) {
        const sizes = body.sizes.map((size) => ({
          product_id: productId,
          size
        }));

        await supabase.from('product_sizes').insert(sizes);
      }

      // 4️⃣ Insert colors
      if (body.colors?.length) {
        const colors = body.colors.map((color) => ({
          product_id: productId,
          name: color.name,
          name_ar: color.nameAr,
          hex: color.hex
        }));

        await supabase.from('product_colors').insert(colors);
      }

      // 5️⃣ Insert tags
      if (body.tags?.length) {
        const tags = body.tags.map((tag) => ({
          product_id: productId,
          tag
        }));

        await supabase.from('product_tags').insert(tags);
      }

      // Return camelCase response
      res.status(201).json({
        message: 'Product created successfully',
        productId: productId
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Update a product
  router.put('/:id', async (req, res) => {
    try {
      // Convert incoming camelCase to snake_case for Supabase
      const updates = toSnakeCase(req.body);
      
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', req.params.id);
      
      if (error) return res.status(500).json({ error: error.message });
      
      // Return camelCase response
      res.json({ 
        message: 'Product updated',
        id: req.params.id 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete a product
  router.delete('/:id', async (req, res) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    
    res.json({ 
      message: 'Product deleted',
      id: req.params.id 
    });
  });

  return router;
};