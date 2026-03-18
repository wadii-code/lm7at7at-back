const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  // Fetch all orders
  router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Add a new order
  router.post('/', async (req, res) => {
    const { error } = await supabase.from('orders').insert([req.body]);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: 'Order created' });
  });

  // Update an order status
  router.put('/:id', async (req, res) => {
    const { error } = await supabase.from('orders').update({ status: req.body.status }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Order updated' });
  });

  // Route to delete an order
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      // First, delete related order_items
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);

      if (deleteItemsError) {
        // If the order had no items, this might error, but we can proceed
        console.warn(`Could not delete order_items for order ${id}, proceeding to delete order anyway. Error: ${deleteItemsError.message}`);
      }

      // Then, delete the order itself
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (deleteOrderError) {
        throw deleteOrderError;
      }

      res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ message: 'Error deleting order', error: error.message });
    }
  });

  return router;
};