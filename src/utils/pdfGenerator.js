const PDFDocument = require('pdfkit');

function generateInvoicePDF(invoice, client, dataCallback, endCallback) {
  const doc = new PDFDocument({ margin: 50 });
  
  doc.on('data', dataCallback);
  doc.on('end', endCallback);
  
  // Header
  doc
    .fillColor('#334155')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('INVOICE', 50, 50, { align: 'right' });
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Invoice Number: ${invoice.invoice_number}`, 50, 80, { align: 'right' })
    .text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`, 50, 95, { align: 'right' })
    .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-IN')}`, 50, 110, { align: 'right' });

  // Company Info
  const companyName = process.env.COMPANY_NAME || 'Security Firm Services';
  const companyAddress = process.env.COMPANY_ADDRESS || '123 Security Avenue, Business Park\nAhmedabad, Gujarat 380015';
  const companyPhone = process.env.COMPANY_PHONE || '+91 98765 43210';
  const companyEmail = process.env.COMPANY_EMAIL || 'info@securityfirm.com';

  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(companyName, 50, 50);
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(companyAddress, 50, 75)
    .text(`Phone: ${companyPhone}`, 50, doc.y + 2)
    .text(`Email: ${companyEmail}`, 50, doc.y + 2);

  doc.moveDown(3);

  // Bill To
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#334155')
    .text('Bill To:');
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#0f172a')
    .text(client.name)
    .text(client.address)
    .text(`${client.city}, ${client.state} ${client.postal_code || ''}`)
    .text(`Phone: ${client.phone}`)
    .text(`Email: ${client.email}`);
    
  if (client.gst_number) {
    doc.text(`GSTIN: ${client.gst_number}`);
  }

  doc.moveDown(2);

  // Billing Period
  const periodStart = new Date(invoice.billing_period_start).toLocaleDateString('en-IN');
  const periodEnd = new Date(invoice.billing_period_end).toLocaleDateString('en-IN');
  
  doc
    .fontSize(11)
    .font('Helvetica-Oblique')
    .fillColor('#475569')
    .text(`Billing Period: ${periodStart} to ${periodEnd}`);

  doc.moveDown(1);

  // Table Header
  const tableTop = doc.y + 10;
  
  doc.font('Helvetica-Bold');
  generateTableRow(doc, tableTop, 'Description', 'Amount', '#f8fafc', '#334155');
  
  // Table Content
  let currentY = tableTop + 30;
  doc.font('Helvetica');
  
  generateTableRow(
    doc, 
    currentY, 
    'Security Services Monthly Charge', 
    `Rs ${Number(invoice.amount_subtotal).toLocaleString('en-IN')}`, 
    '#ffffff', 
    '#334155'
  );
  
  currentY += 30;
  
  // Totals Area
  const totalsTop = currentY + 20;
  
  doc.font('Helvetica');
  
  // Subtotal
  doc.text('Subtotal:', 350, totalsTop, { align: 'left' });
  doc.text(`Rs ${Number(invoice.amount_subtotal).toLocaleString('en-IN')}`, 450, totalsTop, { align: 'right' });
  
  // Discount
  if (Number(invoice.discount_amount) > 0) {
    doc.text('Discount:', 350, totalsTop + 20, { align: 'left' });
    doc.text(`-Rs ${Number(invoice.discount_amount).toLocaleString('en-IN')}`, 450, totalsTop + 20, { align: 'right' });
    currentY += 20;
  }
  
  // Tax
  if (Number(invoice.tax_amount) > 0) {
    doc.text(`GST (${invoice.tax_rate}%):`, 350, totalsTop + 20 + (invoice.discount_amount > 0 ? 20 : 0), { align: 'left' });
    doc.text(`Rs ${Number(invoice.tax_amount).toLocaleString('en-IN')}`, 450, totalsTop + 20 + (invoice.discount_amount > 0 ? 20 : 0), { align: 'right' });
  }

  // Final Total
  const finalTotalTop = totalsTop + 60;
  
  doc
    .moveTo(350, finalTotalTop - 10)
    .lineTo(550, finalTotalTop - 10)
    .lineWidth(1)
    .strokeColor('#cbd5e1')
    .stroke();
    
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#0f172a')
    .text('Total Amount:', 350, finalTotalTop, { align: 'left' })
    .text(`Rs ${Number(invoice.final_amount).toLocaleString('en-IN')}`, 450, finalTotalTop, { align: 'right' });

  // Status
  doc.moveDown(4);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155').text('Payment Status: ');
  
  const statusColors = {
    paid: '#10b981',
    partially_paid: '#f59e0b',
    overdue: '#ef4444',
    sent: '#3b82f6',
    draft: '#64748b'
  };
  
  const statusColor = statusColors[invoice.status] || '#64748b';
  doc.fillColor(statusColor).text(invoice.status.toUpperCase(), 150, doc.y - 14);

  // Footer
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Terms & Conditions:', 50, 700)
    .fontSize(8)
    .text('1. Payment is due within the stated due date.', 50, 715)
    .text('2. Please make all cheques payable to Security Firm Services.', 50, 725)
    .text('3. For any queries regarding this invoice, please contact our support.', 50, 735);

  doc.end();
}

function generateTableRow(doc, y, description, amount, bgColor, textColor) {
  if (bgColor !== '#ffffff') {
    doc.rect(50, y - 10, 500, 30).fill(bgColor);
  }
  
  doc
    .fillColor(textColor)
    .text(description, 60, y)
    .text(amount, 450, y, { width: 90, align: 'right' });
}

module.exports = {
  generateInvoicePDF
};
