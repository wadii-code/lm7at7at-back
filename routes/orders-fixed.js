const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');

module.exports = function(supabase) {
  const router = express.Router();

  // POST a new order (allow guest checkout with stock validation)
  router.post('/', async (req, res) => {
    const { customer, items, total, status } = req.body;

    console.log('Order POST received:', JSON.stringify(req.body, null, 2));

    try {
      // Create order first (always succeed)
      const { data, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || '',
          address: customer.address,
          city: customer.city || '',
          items: items,
          total: total,
          status: status || 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Optional stock validation & decrement (demo tolerant)
      const stockIssues = [];
      for (const item of items) {
        try {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.id)
            .single();
          if (product && product.stock_quantity >= item.quantity) {
            await supabase
              .from('products')
              .update({ stock_quantity: supabase.raw('stock_quantity - ?', [item.quantity]) })
              .eq('id', item.id);
          } else {
            stockIssues.push(item.id);
          }
        } catch (stockErr) {
          console.log(`Stock update skipped for ${item.id}:`, stockErr.message);
          stockIssues.push(item.id);
        }
      }

      if (stockIssues.length > 0) {
        console.log('Stock updates skipped:', stockIssues);
      }

      res.status(201).json(data);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(400).json({ message: error.message || 'Error creating order' });
    }
  });

  // GET all orders (admin only)
  router.get('/', authenticateToken, isAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
  });

  // PATCH to update order status (admin only)
  router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error(`Error updating status for order ${id}:`, error);
      res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
  });

  // DELETE an order (admin only)
  router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);

      if (error) throw error;

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Error deleting order', error: error.message });
    }
  });

  return router;
};

