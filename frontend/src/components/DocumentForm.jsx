import React, { useState, useEffect } from 'react';
import BOMTable from './BOMTable';
import { RefreshCw, Save, Download, RotateCcw } from 'lucide-react';
import { rupeesToPaise } from '../utils/math';
import { apiFetch } from '../utils/api';

export default function DocumentForm({
  formData,
  onChangeFormData,
  calculatedTotals,
  onSaveDocument,
  onDownloadPDF,
  validationErrors
}) {
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Sync shipping address with billing if checkbox is checked
  useEffect(() => {
    if (sameAsBilling) {
      onChangeFormData({
        ...formData,
        shipping_address: formData.billing_address
      });
    }
  }, [formData.billing_address, sameAsBilling]);

  // Fetch the next document number automatically when Type changes
  const fetchNextDocNumber = async (selectedType) => {
    try {
      const response = await apiFetch(`/api/documents/next-number?type=${encodeURIComponent(selectedType)}`);
      if (response.ok) {
        const data = await response.json();
        onChangeFormData({
          ...formData,
          type: selectedType,
          number: data.nextNumber
        });
      }
    } catch (err) {
      console.error('Error fetching document number:', err);
    }
  };

  // Run on mount or when type changes
  useEffect(() => {
    fetchNextDocNumber(formData.type);
  }, [formData.type]);

  const handleInputChange = (field, value) => {
    onChangeFormData({
      ...formData,
      [field]: value
    });
  };

  const handleItemsChange = (newItems) => {
    onChangeFormData({
      ...formData,
      bom_items: newItems
    });
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the form? All current entries will be lost.")) {
      onChangeFormData({
        type: 'Tax Invoice',
        number: '',
        date: new Date().toISOString().split('T')[0],
        customer_name: '',
        billing_address: '',
        shipping_address: '',
        gstin: '',
        po_reference: '',
        discount_type: 'percentage',
        discount_value: 0,
        transaction_type: 'CGST_SGST',
        bom_items: [
          { id: 1, name: '', hsn: '', quantity: 1, unit: 'pcs', unitPrice: '' }
        ]
      });
      setSameAsBilling(true);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>Document Configuration</h2>
      </div>

      {/* Document Type Selector Segmented Control */}
      <div className="doc-selector">
        {['Quote', 'Tax Invoice', 'Delivery Challan'].map((t) => (
          <button
            key={t}
            type="button"
            className={`doc-sel-btn ${formData.type === t ? 'active' : ''}`}
            onClick={() => handleInputChange('type', t)}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Row 1: Number, Date, Transaction Type */}
        <h3 className="form-section-title">Details & Logistics</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Document Number (Auto)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={formData.number}
                readOnly
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)' }}
              />
              <button
                type="button"
                className="btn-icon-only"
                title="Fetch next number"
                onClick={() => fetchNextDocNumber(formData.type)}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Document Date</label>
            <input
              type="date"
              value={formData.date}
              className={validationErrors.date ? 'error' : ''}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
            {validationErrors.date && <span className="error-text">{validationErrors.date}</span>}
          </div>

          <div className="form-group">
            <label>State of Supply (GST logic)</label>
            <select
              value={formData.transaction_type}
              onChange={(e) => handleInputChange('transaction_type', e.target.value)}
            >
              <option value="CGST_SGST">Intra-state (CGST 9% + SGST 9%)</option>
              <option value="IGST">Inter-state (IGST 18%)</option>
            </select>
          </div>
        </div>

        {/* Customer Details */}
        <h3 className="form-section-title">Customer Details</h3>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Customer Legal Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corporates Ltd"
              value={formData.customer_name}
              className={validationErrors.customer_name ? 'error' : ''}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
            />
            {validationErrors.customer_name && (
              <span className="error-text">{validationErrors.customer_name}</span>
            )}
          </div>

          <div className="form-group">
            <label>Customer GSTIN</label>
            <input
              type="text"
              placeholder="e.g. 27AAAAF1234A1Z5"
              value={formData.gstin}
              className={validationErrors.gstin ? 'error' : ''}
              onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
            />
            {validationErrors.gstin && <span className="error-text">{validationErrors.gstin}</span>}
          </div>

          <div className="form-group">
            <label>PO Reference No.</label>
            <input
              type="text"
              placeholder="e.g. PO-9982-AX"
              value={formData.po_reference}
              onChange={(e) => handleInputChange('po_reference', e.target.value)}
            />
          </div>
        </div>

        {/* Addresses */}
        <div className="form-grid">
          <div className="form-group">
            <label>Billing Address</label>
            <textarea
              rows={3}
              placeholder="Full billing address..."
              value={formData.billing_address}
              className={validationErrors.billing_address ? 'error' : ''}
              onChange={(e) => handleInputChange('billing_address', e.target.value)}
            />
            {validationErrors.billing_address && (
              <span className="error-text">{validationErrors.billing_address}</span>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label>Shipping Address</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  style={{ width: 'auto', padding: 0 }}
                />
                Same as Billing
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Full shipping address..."
              value={formData.shipping_address}
              disabled={sameAsBilling}
              className={validationErrors.shipping_address ? 'error' : ''}
              style={sameAsBilling ? { backgroundColor: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)' } : {}}
              onChange={(e) => handleInputChange('shipping_address', e.target.value)}
            />
            {validationErrors.shipping_address && (
              <span className="error-text">{validationErrors.shipping_address}</span>
            )}
          </div>
        </div>

        {/* BOM Items Table */}
        <BOMTable
          items={formData.bom_items}
          onChangeItems={handleItemsChange}
          validationErrors={validationErrors}
        />

        {/* Calculations Adjustments (Discounts) */}
        <div className="calc-summary-section">
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Financial Adjustments
          </h4>
          <div className="form-grid" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label>Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => handleInputChange('discount_type', e.target.value)}
              >
                <option value="none">No Discount</option>
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            {formData.discount_type !== 'none' && (
              <div className="form-group">
                <label>
                  {formData.discount_type === 'percentage' ? 'Discount Percentage' : 'Discount Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '0.1' : '1'}
                  value={formData.discount_value}
                  className={validationErrors.discount_value ? 'error' : ''}
                  onChange={(e) => handleInputChange('discount_value', parseFloat(e.target.value) || 0)}
                />
                {validationErrors.discount_value && (
                  <span className="error-text">{validationErrors.discount_value}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Validation summary banner if there are errors */}
        {Object.keys(validationErrors).length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error)',
            borderRadius: '6px',
            color: 'var(--error)',
            fontSize: '0.85rem'
          }}>
            <strong>Please resolve the validation errors highlighted above before generating the document.</strong>
          </div>
        )}

        {/* Actions Row */}
        <div className="action-bar">
          <button type="button" className="btn" onClick={handleReset}>
            <RotateCcw size={16} /> Reset
          </button>
          <button type="button" className="btn" onClick={onDownloadPDF}>
            <Download size={16} /> Preview PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={onSaveDocument}>
            <Save size={16} /> Save & Generate Document
          </button>
        </div>
      </form>
    </div>
  );
}
