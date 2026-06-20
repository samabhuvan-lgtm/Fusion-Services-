import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Download, Share2, Eye, X, MessageSquare, Mail } from 'lucide-react';
import { formatCurrency } from '../utils/math';
import { downloadPDF, shareDocument } from '../utils/pdf';
import DocumentPreview from './DocumentPreview';

export default function Dashboard({ triggerRefresh, onSetToast }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Fetch documents from backend API
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to fetch documents');
      }
    } catch (err) {
      console.error('Network error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [triggerRefresh]);

  const handleDownload = (doc) => {
    try {
      downloadPDF(doc);
      onSetToast({ message: `Successfully downloaded PDF for ${doc.number}`, type: 'success' });
    } catch (err) {
      onSetToast({ message: 'Error generating PDF file.', type: 'error' });
    }
  };

  const handleShare = (doc, channel) => {
    try {
      shareDocument(doc, channel);
      onSetToast({ message: `Sharing prompt triggered via ${channel}`, type: 'success' });
    } catch (err) {
      onSetToast({ message: 'Failed to share document.', type: 'error' });
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      doc.customer_name.toLowerCase().includes(query) ||
      doc.number.toLowerCase().includes(query) ||
      doc.date.includes(query);
      
    const matchesType = filterType === 'All' || doc.type === filterType;

    return matchesSearch && matchesType;
  });

  const getBadgeClass = (type) => {
    if (type === 'Quote') return 'badge quote';
    if (type === 'Tax Invoice') return 'badge invoice';
    return 'badge challan';
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <h2>Document Repository & History</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {filteredDocuments.length} Documents Found
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-actions">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by customer, doc number, or date (YYYY-MM-DD)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="nav-tabs" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          {['All', 'Quote', 'Tax Invoice', 'Delivery Challan'].map((type) => (
            <button
              key={type}
              type="button"
              className={`tab-btn ${filterType === type ? 'active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Repository Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No documents found matching the search criteria.</p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Doc Number</th>
                <th>Customer Name</th>
                <th style={{ textAlign: 'right' }}>Total (Incl. Tax)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} className="text-muted" />
                      {doc.date}
                    </div>
                  </td>
                  <td>
                    <span className={getBadgeClass(doc.type)}>{doc.type}</span>
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--accent-indigo)' }}>
                    {doc.number}
                  </td>
                  <td>{doc.customer_name}</td>
                  <td style={{ textAlign: 'right', fontWeight: '600' }}>
                    {formatCurrency(doc.totals.grandTotalPaise)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon-only"
                        title="Quick View"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-only"
                        title="Download PDF"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-only"
                        title="Share via WhatsApp"
                        onClick={() => handleShare(doc, 'whatsapp')}
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-only"
                        title="Share via Email"
                        onClick={() => handleShare(doc, 'email')}
                      >
                        <Mail size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal View details of past document */}
      {selectedDoc && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={getBadgeClass(selectedDoc.type)}>{selectedDoc.type}</span>
                <span>{selectedDoc.number}</span>
              </h3>
              <button
                type="button"
                className="btn-icon-only"
                onClick={() => setSelectedDoc(null)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <DocumentPreview
                  formData={selectedDoc}
                  calculatedTotals={selectedDoc.totals}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn"
                onClick={() => handleShare(selectedDoc, 'email')}
              >
                <Mail size={14} /> Share Email
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleShare(selectedDoc, 'whatsapp')}
              >
                <MessageSquare size={14} /> Share WhatsApp
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDownload(selectedDoc)}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setSelectedDoc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
