const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  // Helper function to convert snake_case to camelCase
  const toCamelCase = (data) => {
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.id,
        name: item.name,
        nameAr: item.name_ar,
        image: item.image,
        href: item.href,
        productCount: item.product_count
      }));
    }
    return {
      id: data.id,
      name: data.name,
      nameAr: data.name_ar,
      image: data.image,
      href: data.href,
      productCount: data.product_count
    };
  };

  // Fetch all collections
  router.get('/', async (req, res) => {
    const { data, error } = await supabase
      .from('collections')
      .select('*');
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Convert snake_case to camelCase for frontend
    const transformedData = toCamelCase(data);
    res.json(transformedData);
  });

  // Add a new collection
  router.post('/', async (req, res) => {
    const body = req.body;
    console.log('Received collection data:', body);
    // Log the size of the image field
    if (body.image) {
      console.log('Image size:', body.image.length, 'characters');
      console.log('Approximate size in MB:', (body.image.length / (1024 * 1024)).toFixed(2));
    }
    
    // Convert camelCase to snake_case for Supabase
    const collectionData = {
      name: body.name,
      name_ar: body.nameAr,
      image: body.image,
      href: body.href,
      product_count: body.productCount || 0
    };
    
    const { data, error } = await supabase
      .from('collections')
      .insert([collectionData])
      .select()
      .single();
    
    if (error) {
      console.log(error)
      return res.status(500).json({ error: error.message });
    }
    
    // Return camelCase response
    res.status(201).json(toCamelCase(data));
  });

  // Update a collection
  router.put('/:id', async (req, res) => {
    const body = req.body;
    
    // Convert camelCase to snake_case for Supabase
    const updates = {};
    if (body.name) updates.name = body.name;
    if (body.nameAr) updates.name_ar = body.nameAr;
    if (body.image) updates.image = body.image;
    if (body.href) updates.href = body.href;
    if (body.productCount !== undefined) updates.product_count = body.productCount;
    
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Return camelCase response
    res.json(toCamelCase(data));
  });

  // Delete a collection
  router.delete('/:id', async (req, res) => {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    
    res.json({ 
      message: 'Collection deleted',
      id: req.params.id 
    });
  });

  return router;
};