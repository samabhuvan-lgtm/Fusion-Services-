import React, { useState, useMemo, useEffect } from 'react';
import { FilePlus, Database, LogOut } from 'lucide-react';
import DocumentForm from './components/DocumentForm';
import DocumentPreview from './components/DocumentPreview';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { rupeesToPaise, calculateLineSubtotal, calculateDiscountAmount } from './utils/math';
import { downloadPDF } from './utils/pdf';
import { apiFetch } from './utils/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState({
    type: 'Tax Invoice',
    number: '',
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    billing_address: '',
    shipping_address: '',
    gstin: '',
    po_reference: '',
    discount_type: 'none',
    discount_value: 0,
    transaction_type: 'CGST_SGST',
    bom_items: [
      { id: 1, name: '', hsn: '', quantity: 1, unit: 'pcs', unitPrice: '' }
    ]
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Auto-clear Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await apiFetch('/api/auth/me');
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setUser(null);
      }
    };
    checkSession();
  }, []);

  // Real-time calculation engine using useMemo to avoid performance lag
  const calculatedTotals = useMemo(() => {
    let totalQuantity = 0;
    let subtotalPaise = 0;

    formData.bom_items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      totalQuantity += qty;
      const ratePaise = rupeesToPaise(item.unitPrice);
      subtotalPaise += calculateLineSubtotal(qty, ratePaise);
    });

    const discountPaise = calculateDiscountAmount(
      subtotalPaise,
      formData.discount_type,
      formData.discount_value
    );

    const taxBasisPaise = Math.max(0, subtotalPaise - discountPaise);

    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    if (formData.transaction_type === 'CGST_SGST') {
      cgstPaise = Math.round(taxBasisPaise * 0.09); // 9% CGST
      sgstPaise = Math.round(taxBasisPaise * 0.09); // 9% SGST
    } else {
      igstPaise = Math.round(taxBasisPaise * 0.18); // 18% IGST
    }

    const grandTotalPaise = taxBasisPaise + cgstPaise + sgstPaise + igstPaise;
    const grandTotalWithoutGstPaise = taxBasisPaise;

    return {
      totalQuantity,
      subtotalPaise,
      discountPaise,
      taxBasisPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      grandTotalPaise,
      grandTotalWithoutGstPaise
    };
  }, [formData.bom_items, formData.discount_type, formData.discount_value, formData.transaction_type]);

  // Normalized form data where unitPrice is in Paise
  const normalizedFormData = useMemo(() => {
    return {
      ...formData,
      bom_items: formData.bom_items.map((item) => ({
        ...item,
        unitPrice: rupeesToPaise(item.unitPrice)
      })),
      totals: calculatedTotals
    };
  }, [formData, calculatedTotals]);

  // Client-side Validation Engine
  const validateForm = () => {
    const errors = {};
    
    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Customer Name is required.';
    }

    if (!formData.billing_address.trim()) {
      errors.billing_address = 'Billing Address is required.';
    }

    if (!formData.shipping_address.trim()) {
      errors.shipping_address = 'Shipping Address is required.';
    }

    if (!formData.date) {
      errors.date = 'Date is required.';
    }

    // Tax Invoice requires valid GSTIN in India
    if (formData.type === 'Tax Invoice') {
      if (!formData.gstin.trim()) {
        errors.gstin = 'GSTIN is mandatory for Tax Invoices.';
      } else {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstin)) {
          errors.gstin = 'Invalid GSTIN format (e.g. 27AAAAF1234A1Z5).';
        }
      }
    } else if (formData.gstin.trim()) {
      // If provided for Quote/Challan, validate format
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(formData.gstin)) {
        errors.gstin = 'Invalid GSTIN format.';
      }
    }

    // Validate Discount Values
    if (formData.discount_type === 'percentage') {
      if (formData.discount_value < 0 || formData.discount_value > 100) {
        errors.discount_value = 'Discount percentage must be between 0 and 100.';
      }
    } else if (formData.discount_type === 'flat') {
      if (formData.discount_value < 0) {
        errors.discount_value = 'Discount amount cannot be negative.';
      } else if (rupeesToPaise(formData.discount_value) > calculatedTotals.subtotalPaise) {
        errors.discount_value = 'Discount cannot exceed subtotal amount.';
      }
    }

    // Validate BOM Items
    if (!formData.bom_items || formData.bom_items.length === 0) {
      errors.bom = 'At least one item is required in the BOM.';
    } else {
      formData.bom_items.forEach((item, index) => {
        if (!item.name.trim()) {
          errors[`bom_${index}_name`] = 'Item name is required.';
        }
        
        const q = parseFloat(item.quantity);
        if (isNaN(q) || q <= 0) {
          errors[`bom_${index}_quantity`] = 'Quantity must be greater than 0.';
        }

        const price = parseFloat(item.unitPrice);
        if (isNaN(price) || price < 0) {
          errors[`bom_${index}_price`] = 'Price must be positive.';
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Preview PDF handler
  const handleDownloadPreview = () => {
    if (!validateForm()) {
      setToast({ message: 'Validation failed. Please review errors.', type: 'error' });
      return;
    }
    downloadPDF(normalizedFormData);
    setToast({ message: 'Preview PDF downloaded.', type: 'success' });
  };

  // Submit and Save to SQLite
  const handleSaveAndGenerate = async () => {
    if (!validateForm()) {
      setToast({ message: 'Validation failed. Please review highlighted fields.', type: 'error' });
      return;
    }

    try {
      const response = await apiFetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify(normalizedFormData)
      });

      const result = await response.json();

      if (response.ok) {
        setToast({ message: 'Document saved and registered successfully!', type: 'success' });
        
        downloadPDF(normalizedFormData);

        // Reset form to defaults
        setFormData({
          type: 'Tax Invoice',
          number: '',
          date: new Date().toISOString().split('T')[0],
          customer_name: '',
          billing_address: '',
          shipping_address: '',
          gstin: '',
          po_reference: '',
          discount_type: 'none',
          discount_value: 0,
          transaction_type: 'CGST_SGST',
          bom_items: [
            { id: 1, name: '', hsn: '', quantity: 1, unit: 'pcs', unitPrice: '' }
          ]
        });

        // Switch to history tab and refresh records
        setTriggerRefresh(prev => prev + 1);
        setActiveTab('history');
      } else {
        setToast({ message: result.error || 'Failed to save document.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Server connection error.', type: 'error' });
    }
  };

  const handleLogin = async ({ username, password }) => {
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const result = await response.json();
        setAuthError(result.error || 'Login failed');
        return;
      }

      const data = await response.json();
      setUser(data);
      setAuthError(null);
      setToast({ message: `Welcome back, ${data.username}!`, type: 'success' });
    } catch (err) {
      if (err.message === 'unauthenticated') {
        setAuthError('Invalid username or password');
      } else {
        setAuthError('Unable to reach authentication server');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // ignore logout failures
    }
    setUser(null);
    setActiveTab('create');
    setToast({ message: 'Logged out successfully', type: 'success' });
  };

  if (!user) {
    return <Login onLogin={handleLogin} authError={authError} />;
  }

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <h1>FusionDocs</h1>
            <span>B2B Engine</span>
          </div>
        </div>

        <div className="header-actions">
          <nav className="nav-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <FilePlus size={16} /> Create Document
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Database size={16} /> History Dashboard
            </button>
          </nav>

          <div className="user-actions">
            <span className="user-chip">{user?.username || 'User'}</span>
            <button type="button" className="btn btn-icon-only" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content Workspace */}
      <main>
        {activeTab === 'create' ? (
          <div className="workspace-grid">
            <DocumentForm
              formData={formData}
              onChangeFormData={setFormData}
              calculatedTotals={calculatedTotals}
              onSaveDocument={handleSaveAndGenerate}
              onDownloadPDF={handleDownloadPreview}
              validationErrors={validationErrors}
            />
             <DocumentPreview
              formData={normalizedFormData}
              calculatedTotals={calculatedTotals}
            />
          </div>
        ) : (
          <Dashboard
            triggerRefresh={triggerRefresh}
            onSetToast={setToast}
          />
        )}
      </main>
    </div>
  );
}
