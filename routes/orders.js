const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');

module.exports = function(supabase) {
  const router = express.Router();

  // POST a new order (allow guest checkout with stock validation)
  router.post('/', async (req, res) => {
    const { customer, items, total, status } = req.body;

    try {
      // Validate stock for each item
      const stockChecks = items.map(async (item) => {
        const { data: product, error } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();
        if (error || !product || product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name || item.id}: requested ${item.quantity}, available ${product ? product.stock_quantity : 0}`);
        }
        return product;
      });
      
      await Promise.all(stockChecks);

      // Create order
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

      // Decrement stock
      for (const item of items) {
        await supabase
          .from('products')
          .update({ stock_quantity: supabase.raw('stock_quantity - ?', [item.quantity]) })
          .eq('id', item.id);
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
        .select('*') // Correctly select the items JSONB column
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
      // This is the correct logic, as there is no separate order_items table being used.
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