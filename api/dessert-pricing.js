/**
 * Dessert Pricing API
 * Handles CRUD operations for dessert cost calculation and pricing
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Dessert pricing API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET - Fetch all dessert pricing items
 */
async function handleGet(req, res) {
  const { data, error } = await supabase
    .from('dessert_pricing')
    .select('*')
    .order('category', { ascending: true })
    .order('item_name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching items:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  return res.status(200).json({
    success: true,
    data: data
  });
}

/**
 * POST - Create new dessert pricing item
 */
async function handlePost(req, res) {
  const item = req.body;

  // Validate required fields
  if (!item.item_name) {
    return res.status(400).json({
      success: false,
      error: 'item_name is required'
    });
  }

  if (!item.category) {
    return res.status(400).json({
      success: false,
      error: 'category is required (baklava, turkish_delight_current, turkish_delight_adjusted)'
    });
  }

  const { data, error } = await supabase
    .from('dessert_pricing')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating item:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  console.log(`✅ Created new item: ${item.item_name} (${item.category})`);

  return res.status(201).json({
    success: true,
    data: data
  });
}

/**
 * PUT - Update existing dessert pricing item
 */
async function handlePut(req, res) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'id is required for update'
    });
  }

  // Update timestamp
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('dessert_pricing')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating item:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  console.log(`✅ Updated item: ${data.item_name} (ID: ${id})`);

  return res.status(200).json({
    success: true,
    data: data
  });
}

/**
 * DELETE - Delete dessert pricing item
 */
async function handleDelete(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'id is required for deletion'
    });
  }

  // Fetch item name before deletion for logging
  const { data: itemData } = await supabase
    .from('dessert_pricing')
    .select('item_name, category')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('dessert_pricing')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Error deleting item:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }

  console.log(`✅ Deleted item: ${itemData?.item_name || id} (${itemData?.category || 'unknown'})`);

  return res.status(200).json({
    success: true,
    message: 'Item deleted successfully'
  });
}
