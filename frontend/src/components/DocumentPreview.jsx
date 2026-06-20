import React from 'react';
import { formatCurrency, calculateLineSubtotal, rupeesToPaise, numberToWords } from '../utils/math';

export default function DocumentPreview({ formData, calculatedTotals }) {
  const {
    type,
    number,
    date,
    customer_name,
    billing_address,
    shipping_address,
    gstin,
    po_reference,
    discount_type,
    discount_value,
    transaction_type,
    bom_items
  } = formData;

  return (
    <div className="preview-container">
      <div className="form-section-title" style={{ borderLeftColor: 'var(--success)', color: 'var(--success)' }}>
        Real-Time PDF Preview
      </div>
      
      <div className="paper-sheet">
        {/* Letterhead */}
        <div className="paper-letterhead">
          <div>
            <div className="paper-logo">
              <div className="paper-logo-box"></div>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em' }}>FUSIONDOCS</span>
            </div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-text-muted)' }}>
              Enterprise Document Systems
            </div>
          </div>
          <div className="paper-vendor-info">
            <strong>FusionDocs Solutions Pvt. Ltd.</strong><br />
            Plot No. 45, Software Technology Park, MIDC,<br />
            Andheri East, Mumbai, Maharashtra - 400069<br />
            GSTIN: 27AAAAF1234A1Z5 | contact@fusiondocs.com
          </div>
        </div>

        {/* Title */}
        <div className="paper-doc-title">
          {type ? type.toUpperCase() : 'DOCUMENT'}
        </div>

        {/* Meta Info Grid */}
        <div className="paper-meta-grid">
          <div className="paper-meta-block">
            <h4>Document Details</h4>
            <div className="paper-meta-row">
              <span><strong>Doc Number:</strong></span>
              <span>{number || 'Draft'}</span>
            </div>
            <div className="paper-meta-row">
              <span><strong>Doc Date:</strong></span>
              <span>{date || 'N/A'}</span>
            </div>
          </div>
          <div className="paper-meta-block">
            <h4>Supply Details</h4>
            <div className="paper-meta-row">
              <span><strong>Supply Type:</strong></span>
              <span>{transaction_type === 'CGST_SGST' ? 'Intra-state' : 'Inter-state'}</span>
            </div>
            <div className="paper-meta-row">
              <span><strong>PO Reference:</strong></span>
              <span>{po_reference || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="paper-address-grid">
          <div className="paper-address-block">
            <h4>Billed To</h4>
            <strong>{customer_name || 'Customer Name'}</strong>
            <p style={{ whiteSpace: 'pre-line', marginTop: '0.25rem', color: 'var(--paper-text-muted)' }}>
              {billing_address || 'Billing address details...'}
            </p>
          </div>
          <div className="paper-address-block">
            <h4>Shipped To</h4>
            <strong>{customer_name || 'Customer Name'}</strong>
            <p style={{ whiteSpace: 'pre-line', marginTop: '0.25rem', color: 'var(--paper-text-muted)' }}>
              {shipping_address || 'Shipping address details...'}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem', fontSize: '0.75rem' }}>
          <strong>Customer GSTIN:</strong> {gstin || 'N/A'}
        </div>

        {/* BOM Table */}
        <table className="paper-table">
          <thead>
            <tr>
              <th style={{ width: '30px', textAlign: 'center' }}>#</th>
              <th>Item Name</th>
              <th style={{ textAlign: 'center' }}>HSN</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'center' }}>Unit</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bom_items.map((item, index) => {
              const pricePaise = parseInt(item.unitPrice || 0, 10);
              const subtotalPaise = calculateLineSubtotal(item.quantity, pricePaise);
              return (
                <tr key={item.id || index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>{item.name || 'Untitled Item'}</td>
                  <td style={{ textAlign: 'center' }}>{item.hsn || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(pricePaise)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '500' }}>{formatCurrency(subtotalPaise)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Calculations Section */}
        <div className="paper-calc-section">
          <div className="paper-words-block">
            <strong>Amount in Words:</strong>
            <span style={{ fontStyle: 'italic' }}>
              {numberToWords(calculatedTotals.grandTotalPaise)}
            </span>
          </div>
          <div>
            <table className="paper-calc-table">
              <tbody>
                <tr className="paper-calc-row">
                  <td>Subtotal:</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.subtotalPaise)}</td>
                </tr>
                {calculatedTotals.discountPaise > 0 && (
                  <tr className="paper-calc-row">
                    <td>
                      Discount ({discount_type === 'percentage' ? `${discount_value}%` : 'Flat'}):
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--error)' }}>
                      -{formatCurrency(calculatedTotals.discountPaise)}
                    </td>
                  </tr>
                )}
                <tr className="paper-calc-row">
                  <td>Taxable Value:</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.taxBasisPaise)}</td>
                </tr>
                {transaction_type === 'CGST_SGST' ? (
                  <>
                    <tr className="paper-calc-row">
                      <td>CGST (9%):</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.cgstPaise)}</td>
                    </tr>
                    <tr className="paper-calc-row">
                      <td>SGST (9%):</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.sgstPaise)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="paper-calc-row">
                    <td>IGST (18%):</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.igstPaise)}</td>
                  </tr>
                )}
                <tr className="paper-calc-row grand-total">
                  <td>Grand Total:</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(calculatedTotals.grandTotalPaise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="paper-footer">
          <div>
            <strong>Payment Terms:</strong> Bank Transfer<br />
            Bank: Axis Bank | A/C: 924020087654321<br />
            IFSC Code: UTIB0001042
          </div>
          <div className="paper-sign-block">
            <strong>For FusionDocs Solutions Pvt. Ltd.</strong>
            <span style={{ fontSize: '0.65rem', borderTop: '1px solid var(--paper-border)', paddingTop: '0.2rem' }}>
              Authorized Signatory
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
