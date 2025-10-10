import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'
import { importInventoryItems } from './utils/importInventory.js'
import { calculateSuggestedOrders } from './utils/orderCalculation.js'
import jsPDF from 'jspdf'
import './App.css'

function App() {
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('inventory')
  const [newItem, setNewItem] = useState({
    item_name: '',
    vendor_name: '',
    unit: '',
    par_level: 0,
    category: ''
  })

  useEffect(() => {
    initializeInventory()
    if (activeTab === 'orders') {
      fetchOrders()
    }
  }, [activeTab])

  const initializeInventory = async () => {
    try {
      // Check if we already have inventory items
      const { data: existingItems, error: checkError } = await supabase
        .from('inventory_items')
        .select('id')
        .limit(1);

      if (checkError) throw checkError;

      // If no items exist, import them
      if (!existingItems || existingItems.length === 0) {
        await importInventoryItems();
      }

      // Always fetch inventory after potential import
      await fetchInventory();
    } catch (error) {
      console.error('Error initializing inventory:', error);
      // Still try to fetch whatever exists
      await fetchInventory();
    }
  }

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    const calculatedOrders = await calculateSuggestedOrders()
    setOrders(calculatedOrders)
    setLoading(false)
  }

  const updateParLevel = async (id, newParLevel) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ par_level: newParLevel })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setInventory(inventory.map(item =>
        item.id === id ? { ...item, par_level: newParLevel } : item
      ))
    } catch (error) {
      console.error('Error updating par level:', error)
    }
  }

  const addNewItem = async (e) => {
    e.preventDefault()
    if (!newItem.item_name || !newItem.vendor_name || !newItem.unit) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // First ensure vendor exists
      const { error: vendorError } = await supabase
        .from('vendors')
        .upsert({ vendor_name: newItem.vendor_name }, { onConflict: 'vendor_name' })

      if (vendorError) throw vendorError

      // Add the item
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          item_name: newItem.item_name,
          vendor_name: newItem.vendor_name,
          unit: newItem.unit,
          par_level: newItem.par_level || 0,
          category: newItem.category || 'OTHER',
          count_frequency: 'weekly'
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      setInventory([...inventory, data])

      // Reset form
      setNewItem({
        item_name: '',
        vendor_name: '',
        unit: '',
        par_level: 0,
        category: ''
      })

      alert('Item added successfully!')
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item: ' + error.message)
    }
  }

  const printOrder = (vendor, orderData) => {
    const printWindow = window.open('', '_blank');
    const orderHtml = `
      <html>
        <head>
          <title>Order for ${vendor}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Order for ${vendor}</h1>
          <p><strong>Order Date:</strong> ${orderData.orderDate}</p>
          <p><strong>Delivery Date:</strong> ${orderData.deliveryDate}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th>Par Level</th>
                <th>Current Stock</th>
                <th>Suggested Qty</th>
              </tr>
            </thead>
            <tbody>
              ${orderData.items.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.unit}</td>
                  <td>${item.parLevel}</td>
                  <td>${item.currentStock}</td>
                  <td>${item.suggestedQty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(orderHtml);
    printWindow.document.close();
    printWindow.print();
  }

  const generatePDF = (vendor, orderData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Header
    pdf.setFontSize(20);
    pdf.text('Jayna Gyro - Purchase Order', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(12);
    pdf.text(`Vendor: ${vendor}`, margin, yPosition);
    yPosition += 10;
    pdf.text(`Order Date: ${orderData.orderDate} (${orderData.dayName})`, margin, yPosition);
    yPosition += 10;
    pdf.text(`Delivery Date: ${orderData.deliveryDate}`, margin, yPosition);
    yPosition += 10;
    if (orderData.orderType) {
      pdf.text(`Order Type: ${orderData.orderType}`, margin, yPosition);
      yPosition += 10;
    }
    if (orderData.notes) {
      pdf.text(`Notes: ${orderData.notes}`, margin, yPosition);
      yPosition += 15;
    } else {
      yPosition += 5;
    }

    // Table headers
    const headers = ['Item', 'Unit', 'Par Level', 'Current Stock', 'Suggested Qty'];
    const columnWidths = [80, 20, 25, 30, 35];
    let xPosition = margin;

    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');

    headers.forEach((header, index) => {
      pdf.text(header, xPosition, yPosition);
      xPosition += columnWidths[index];
    });
    yPosition += 10;

    // Table rows
    orderData.items.forEach((item, index) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      xPosition = margin;
      const values = [
        item.itemName,
        item.unit,
        item.parLevel.toString(),
        item.currentStock.toString(),
        item.suggestedQty.toString()
      ];

      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      }

      values.forEach((value, colIndex) => {
        const maxWidth = columnWidths[colIndex] - 2;
        const lines = pdf.splitTextToSize(value, maxWidth);
        pdf.text(lines, xPosition, yPosition);
        xPosition += columnWidths[colIndex];
      });
      yPosition += 8;
    });

    // Footer
    yPosition += 10;
    pdf.setFontSize(8);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);

    pdf.save(`order-${vendor}-${orderData.orderDate}.pdf`);
  }

  const generateAllPDFs = (allOrders) => {
    Object.entries(allOrders).forEach(([vendor, orderData]) => {
      generatePDF(vendor, orderData);
    });
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      <header>
        <h1>Jayna Gyro Ordering System</h1>
        <nav>
          <button
            className={activeTab === 'inventory' ? 'active' : ''}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory
          </button>
          <button
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            className={activeTab === 'counts' ? 'active' : ''}
            onClick={() => setActiveTab('counts')}
          >
            Inventory Counts
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'inventory' && (
          <div className="inventory-section">
            <div className="section-header">
              <h2>Inventory Management</h2>
            </div>

            <div className="add-item-form">
              <h3>Add New Item</h3>
              <form onSubmit={addNewItem}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Item Name:</label>
                    <input
                      type="text"
                      value={newItem.item_name}
                      onChange={(e) => setNewItem({...newItem, item_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Vendor:</label>
                    <select
                      value={newItem.vendor_name}
                      onChange={(e) => setNewItem({...newItem, vendor_name: e.target.value})}
                      required
                    >
                      <option value="">Select Vendor</option>
                      <option value="Greenleaf">Greenleaf</option>
                      <option value="Mani Imports">Mani Imports</option>
                      <option value="Performance">Performance</option>
                      <option value="Eatopia Foods">Eatopia Foods</option>
                      <option value="Ecolab">Ecolab</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit:</label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      required
                    >
                      <option value="">Select Unit</option>
                      <option value="CS">CS (Case)</option>
                      <option value="EA">EA (Each)</option>
                      <option value="Buckets">Buckets</option>
                      <option value="Cases">Cases</option>
                      <option value="Bags">Bags</option>
                      <option value="Packs">Packs</option>
                      <option value="DZ">DZ (Dozen)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Par Level:</label>
                    <input
                      type="number"
                      value={newItem.par_level}
                      onChange={(e) => setNewItem({...newItem, par_level: parseInt(e.target.value) || 0})}
                      min="0"
                    />
                  </div>
                </div>
                <button type="submit" className="add-item-btn">Add Item</button>
              </form>
            </div>

            <div className="inventory-grid">
              {inventory.map(item => (
                <div key={item.id} className="inventory-item">
                  <h3>{item.item_name}</h3>
                  <p>Vendor: {item.vendor_name}</p>
                  <p>Category: {item.category}</p>
                  <p>Unit: {item.unit}</p>
                  <p>Current Stock: {item.current_on_hand || 0}</p>
                  {item.last_counted && (
                    <p>Last Counted: {new Date(item.last_counted).toLocaleDateString()}</p>
                  )}
                  <div className="par-level">
                    <label>Par Level:</label>
                    <input
                      type="number"
                      value={item.par_level || 0}
                      onChange={(e) => updateParLevel(item.id, parseInt(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <h2>Upcoming Orders</h2>
              <div className="header-actions">
                <button onClick={fetchOrders} className="refresh-btn">
                  Refresh Orders
                </button>
                {Object.keys(orders).length > 0 && (
                  <button onClick={() => generateAllPDFs(orders)} className="pdf-all-btn">
                    Generate All PDFs
                  </button>
                )}
              </div>
            </div>

            {Object.keys(orders).length === 0 ? (
              <p>No orders calculated. Make sure inventory data is imported.</p>
            ) : (
              Object.entries(orders).map(([vendor, orderData]) => (
                <div key={vendor} className="order-card">
                  <div className="order-header">
                    <h3>{vendor}</h3>
                    <div className="order-actions">
                      <button onClick={() => printOrder(vendor, orderData)} className="print-btn">
                        Print Order
                      </button>
                      <button onClick={() => generatePDF(vendor, orderData)} className="pdf-btn">
                        Generate PDF
                      </button>
                    </div>
                  </div>
                  <p><strong>Order Date:</strong> {orderData.orderDate} ({orderData.dayName})</p>
                  <p><strong>Cutoff Time:</strong> {new Date(orderData.cutoffDateTime).toLocaleTimeString()}</p>
                  <p><strong>Delivery Date:</strong> {orderData.deliveryDate}</p>
                  {orderData.orderType && <p><strong>Order Type:</strong> {orderData.orderType}</p>}
                  {orderData.notes && <p><strong>Notes:</strong> {orderData.notes}</p>}

                  <table className="order-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Unit</th>
                        <th>Par Level</th>
                        <th>Current Stock</th>
                        <th>Suggested Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderData.items.map(item => (
                        <tr key={item.itemId}>
                          <td>{item.itemName}</td>
                          <td>{item.unit}</td>
                          <td>{item.parLevel}</td>
                          <td>{item.currentStock}</td>
                          <td>{item.suggestedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'counts' && (
          <div className="counts-section">
            <h2>Inventory Counts</h2>
            <p>Update current stock levels to adjust order calculations.</p>
            <div className="inventory-grid">
              {inventory.map(item => (
                <div key={item.id} className="inventory-item">
                  <h3>{item.item_name}</h3>
                  <p>Vendor: {item.vendor_name}</p>
                  <div className="stock-update">
                    <label>Current Stock:</label>
                    <input
                      type="number"
                      value={item.current_on_hand || 0}
                      onChange={async (e) => {
                        const newStock = parseInt(e.target.value);
                        try {
                          await supabase
                            .from('inventory_items')
                            .update({ current_on_hand: newStock, last_counted: new Date().toISOString() })
                            .eq('id', item.id);
                          setInventory(inventory.map(i =>
                            i.id === item.id ? { ...i, current_on_hand: newStock } : i
                          ));
                        } catch (error) {
                          console.error('Error updating stock:', error);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
