import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, paiseToRupees, numberToWords } from './math';

export function generatePDF(docData) {
  // Create jsPDF document (A4, portrait, pt unit)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Color Palette
  const primaryColor = [30, 41, 59]; // Slate 800 (#1e293b)
  const secondaryColor = [79, 70, 229]; // Indigo 600 (#4f46e5)
  const textColor = [51, 65, 85]; // Slate 700
  const lightGrey = [241, 245, 249]; // Slate 100

  // 1. Draw Elegant Letterhead Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, width, 120, 'F');

  // Letterhead Logo Icon (Drawn using vectors)
  doc.setFillColor(...secondaryColor);
  doc.rect(40, 35, 30, 30, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(48, 43, 14, 14, 'F');
  
  // Letterhead Company Name & Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('FUSIONDOCS', 85, 52);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Enterprise Document Systems', 85, 65);

  // Vendor Details (Right-aligned in header)
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text('FusionDocs Solutions Pvt. Ltd.', width - 40, 40, { align: 'right' });
  doc.text('Plot No. 45, Software Technology Park, Midc,', width - 40, 52, { align: 'right' });
  doc.text('Andheri East, Mumbai, Maharashtra - 400069', width - 40, 64, { align: 'right' });
  doc.text('GSTIN: 27AAAAF1234A1Z5 | contact@fusiondocs.com', width - 40, 76, { align: 'right' });

  // 2. Document Title Section
  doc.setFillColor(...secondaryColor);
  doc.rect(40, 135, width - 80, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleText = docData.type.toUpperCase();
  doc.text(titleText, 50, 151);

  // 3. Metadata block (Document Number, Date, PO Ref)
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  let currentY = 180;
  
  doc.text('DOCUMENT DETAILS', 40, currentY);
  doc.setLineWidth(1);
  doc.setDrawColor(226, 232, 240);
  doc.line(40, currentY + 4, width - 40, currentY + 4);
  
  currentY += 20;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  
  doc.text(`${docData.type} No:`, 40, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(docData.number, 130, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.text('State of Supply:', width - 200, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(docData.transaction_type === 'CGST_SGST' ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)', width - 110, currentY);
  
  currentY += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Document Date:', 40, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(docData.date, 130, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.text('PO Reference:', width - 200, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(docData.po_reference || 'N/A', width - 110, currentY);

  // 4. Customer Billing & Shipping Address Blocks
  currentY += 25;
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CUSTOMER DETAILS', 40, currentY);
  doc.line(40, currentY + 4, width - 40, currentY + 4);
  
  currentY += 20;
  
  // Billing Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Billed To:', 40, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(docData.customer_name, 40, currentY + 14);
  
  // Wrap text function for address fields
  const billingLines = doc.splitTextToSize(docData.billing_address || '', (width - 100) / 2);
  doc.text(billingLines, 40, currentY + 26);
  
  // Shipping Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Shipped To:', width / 2 + 10, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(docData.customer_name, width / 2 + 10, currentY + 14);
  
  const shippingLines = doc.splitTextToSize(docData.shipping_address || '', (width - 100) / 2);
  doc.text(shippingLines, width / 2 + 10, currentY + 26);
  
  // Calculate vertical height of address block to push GSTIN down
  const maxAddressLines = Math.max(billingLines.length, shippingLines.length);
  const addressBlockHeight = 26 + (maxAddressLines * 12);
  
  currentY += addressBlockHeight;
  
  // Add Customer GSTIN
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Customer GSTIN:', 40, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(docData.gstin || 'N/A', 130, currentY);

  currentY += 20;

  // 5. BOM Table Section using AutoTable
  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'Item Name & Description', dataKey: 'name' },
    { header: 'HSN Code', dataKey: 'hsn' },
    { header: 'Quantity', dataKey: 'quantity' },
    { header: 'Unit', dataKey: 'unit' },
    { header: 'Unit Price', dataKey: 'unitPrice' },
    { header: 'Subtotal', dataKey: 'subtotal' }
  ];

  const tableRows = docData.bom_items.map((item, idx) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    return {
      index: idx + 1,
      name: item.name,
      hsn: item.hsn || '-',
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unitPrice: formatCurrency(item.unitPrice),
      subtotal: formatCurrency(itemSubtotal)
    };
  });

  autoTable(doc, {
    startY: currentY,
    columns: tableColumns,
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: textColor
    },
    columnStyles: {
      index: { width: 25, halign: 'center' },
      name: { width: 180 },
      hsn: { width: 60, halign: 'center' },
      quantity: { width: 55, halign: 'right' },
      unit: { width: 45, halign: 'center' },
      unitPrice: { width: 75, halign: 'right' },
      subtotal: { width: 85, halign: 'right' }
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    },
    margin: { left: 40, right: 40 }
  });

  currentY += 20;

  // Check if we have enough space at bottom of current page; otherwise, add a page
  if (currentY > height - 200) {
    doc.addPage();
    currentY = 50;
  }

  // 6. Calculations Summary Block (Bottom Right)
  const calcX = width - 260;
  const valX = width - 40;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  
  const drawCalcRow = (label, amountPaise, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, calcX, currentY);
    doc.text(formatCurrency(amountPaise), valX, currentY, { align: 'right' });
    currentY += 14;
  };

  drawCalcRow('BOM Subtotal:', docData.totals.subtotalPaise);
  
  if (docData.totals.discountPaise > 0) {
    const discLabel = docData.discount_type === 'percentage' 
      ? `Discount (${docData.discount_value}%):` 
      : 'Discount (Flat):';
    drawCalcRow(discLabel, -docData.totals.discountPaise);
  }
  
  drawCalcRow('Taxable Value:', docData.totals.taxBasisPaise);

  if (docData.transaction_type === 'CGST_SGST') {
    drawCalcRow('CGST (9%):', docData.totals.cgstPaise);
    drawCalcRow('SGST (9%):', docData.totals.sgstPaise);
  } else {
    drawCalcRow('IGST (18%):', docData.totals.igstPaise);
  }

  // Draw Grand Total Separator
  doc.setLineWidth(1);
  doc.setDrawColor(...primaryColor);
  doc.line(calcX, currentY - 5, valX, currentY - 5);
  
  currentY += 5;
  doc.setFontSize(10.5);
  drawCalcRow('Grand Total (Incl. GST):', docData.totals.grandTotalPaise, true);
  
  doc.setFontSize(8.5);
  drawCalcRow('Total (Excl. GST):', docData.totals.grandTotalWithoutGstPaise, false);

  // 7. Amount in Words
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Amount in Words:', 40, currentY - 25);
  doc.setFont('helvetica', 'normal');
  const wordsLines = doc.splitTextToSize(numberToWords(docData.totals.grandTotalPaise), width - 320);
  doc.text(wordsLines, 40, currentY - 13);

  // 8. Bottom Information / Bank Details & Signatory (On same line at the bottom)
  currentY = height - 120;
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(40, currentY, width - 40, currentY);
  
  currentY += 15;
  
  // Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('BANK DETAILS FOR PAYMENT', 40, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text('Bank Name: Axis Bank Ltd', 40, currentY + 12);
  doc.text('Account Name: FusionDocs Solutions Pvt Ltd', 40, currentY + 22);
  doc.text('Account Number: 924020087654321', 40, currentY + 32);
  doc.text('IFSC Code: UTIB0001042 | Branch: Andheri East', 40, currentY + 42);

  // Declaration
  const declarationText = 'Declaration: We declare that this document shows the actual price of the goods described and that all particulars are true and correct.';
  const declarationLines = doc.splitTextToSize(declarationText, 220);
  doc.text(declarationLines, 40, currentY + 56);

  // Signatory Box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('For FUSIONDOCS SOLUTIONS PVT LTD', width - 40, currentY, { align: 'right' });
  
  // Authorized Signatory Label
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text('Authorized Signatory', width - 40, currentY + 60, { align: 'right' });

  // 9. Page Numbers Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, width / 2, height - 25, { align: 'center' });
    doc.text('Generated via FusionDocs System', 40, height - 25);
    doc.text('Subject to Mumbai Jurisdiction', width - 40, height - 25, { align: 'right' });
  }

  return doc;
}

// Function to trigger direct download of the PDF file
export function downloadPDF(docData) {
  const doc = generatePDF(docData);
  doc.save(`${docData.number}_${docData.customer_name.replace(/\s+/g, '_')}.pdf`);
}

// Function to generate the share link (e.g. mock email or WhatsApp Web)
export function shareDocument(docData, channel = 'whatsapp') {
  const message = `Dear ${docData.customer_name},\n\nPlease find attached the ${docData.type} ${docData.number} dated ${docData.date} for your review.\n\nTotal Amount: ${formatCurrency(docData.totals.grandTotalPaise)}.\n\nThank you,\nFusionDocs Team`;
  const encodedText = encodeURIComponent(message);
  
  if (channel === 'whatsapp') {
    // Open WhatsApp Web/API with the text message prefilled
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  } else if (channel === 'email') {
    // Open default mail client
    const subject = encodeURIComponent(`${docData.type} ${docData.number} from FusionDocs`);
    window.open(`mailto:?subject=${subject}&body=${encodedText}`, '_blank');
  }
}
