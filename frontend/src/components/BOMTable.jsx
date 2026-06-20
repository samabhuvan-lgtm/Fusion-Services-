import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { calculateLineSubtotal, formatCurrency, rupeesToPaise } from '../utils/math';

export default function BOMTable({ items, onChangeItems, validationErrors }) {
  
  const handleAddRow = () => {
    const nextId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    const newItem = {
      id: nextId,
      name: '',
      hsn: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: '' // Rupee string input
    };
    onChangeItems([...items, newItem]);
  };

  const handleRemoveRow = (id) => {
    if (items.length <= 1) {
      alert("At least one item is required in the Bill of Materials.");
      return;
    }
    onChangeItems(items.filter(item => item.id !== id));
  };

  const handleFieldChange = (id, field, value) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChangeItems(updated);
  };

  return (
    <div className="bom-section">
      <h3 className="form-section-title">Bill of Materials (BOM)</h3>
      
      <div className="bom-table-container">
        <table className="bom-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Item Name & Description</th>
              <th style={{ width: '15%' }}>HSN Code</th>
              <th style={{ width: '10%' }}>Quantity</th>
              <th style={{ width: '10%' }}>Unit</th>
              <th style={{ width: '15%' }}>Unit Price (₹)</th>
              <th style={{ width: '15%' }}>Subtotal</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const pricePaise = rupeesToPaise(item.unitPrice);
              const subtotalPaise = calculateLineSubtotal(item.quantity, pricePaise);
              const hasNameError = validationErrors?.[`bom_${index}_name`];
              const hasPriceError = validationErrors?.[`bom_${index}_price`];
              const hasQuantityError = validationErrors?.[`bom_${index}_quantity`];

              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="text"
                      placeholder="e.g. Steel Rods 10mm"
                      value={item.name}
                      className={hasNameError ? 'error' : ''}
                      onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                    />
                    {hasNameError && <span className="error-text">Required</span>}
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="e.g. 7214"
                      value={item.hsn}
                      onChange={(e) => handleFieldChange(item.id, 'hsn', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={item.quantity}
                      className={hasQuantityError ? 'error' : ''}
                      onChange={(e) => handleFieldChange(item.id, 'quantity', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={item.unit}
                      onChange={(e) => handleFieldChange(item.id, 'unit', e.target.value)}
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="mtr">mtr</option>
                      <option value="ltr">ltr</option>
                      <option value="box">box</option>
                      <option value="rolls">rolls</option>
                      <option value="coils">coils</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPrice}
                      className={hasPriceError ? 'error' : ''}
                      onChange={(e) => handleFieldChange(item.id, 'unitPrice', e.target.value)}
                    />
                    {hasPriceError && <span className="error-text">Invalid price</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '500', paddingRight: '1rem' }}>
                    {formatCurrency(subtotalPaise)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="bom-action-btn"
                      title="Remove Row"
                      onClick={() => handleRemoveRow(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" className="add-row-btn" onClick={handleAddRow}>
        <Plus size={16} /> Add Item Row
      </button>
    </div>
  );
}
