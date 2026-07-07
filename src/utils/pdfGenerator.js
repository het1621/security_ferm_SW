const PDFDocument = require('pdfkit');
const path = require('path');
const converter = require('number-to-words');
const fs = require('fs');

function generateInvoicePDF(invoice, client, agencySettings, dataCallback, endCallback) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  
  doc.on('data', dataCallback);
  doc.on('end', endCallback);

  const startX = 40;
  const endX = 555;
  const tableWidth = endX - startX;

  const getStr = (val, defaultVal = '') => val ? val : defaultVal;

  const agencyName = agencySettings?.agency_name || process.env.COMPANY_NAME || 'EAGLE EYE SECURITY SERVICE';
  const agencyAddress = getStr(agencySettings?.agency_address, 'Office Address:- 418, SHIVALIK SATYAMEV, BOPAL-AMBLI JUNCTION, AHMEDABAD-380058');
  const agencyPhone = getStr(agencySettings?.agency_phone, '8320932214');
  const agencyEmail = getStr(agencySettings?.agency_email, 'info@egleeyesecuritygroup.in');
  const agencyGst = getStr(agencySettings?.gst_number, '24AVYPP2011K1ZB');
  const agencyPan = getStr(agencySettings?.pan_number, agencyGst.length >= 10 ? agencyGst.substring(2, 12) : 'AVYPP2011K');
  const hsnCode = getStr(agencySettings?.hsn_code, '998525');
  const jurisdictionCity = getStr(agencySettings?.jurisdiction_city, 'Ahmedabad');

  if (agencySettings?.agency_logo_url) {
    const logoName = path.basename(agencySettings.agency_logo_url);
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const logoPath = path.join(uploadDir, logoName);
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, startX, 35, { fit: [80, 50], align: 'left', valign: 'top' });
      } catch(e) {
        console.error('Failed to embed logo in invoice PDF:', e);
      }
    }
  }

  // --- Header ---
  doc.font('Times-Bold').fontSize(22).fillColor('#000000').text(agencyName, startX, 40, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Office Address:- ${agencyAddress.replace(/\n/g, ', ')}`, startX, doc.y + 2, { align: 'center' });
  doc.text(`MOBILE NO. ${agencyPhone}`, startX, doc.y + 2, { align: 'center' });
  doc.text(`EMAIL.ID :- ${agencyEmail}`, startX, doc.y + 2, { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(11).text(`GST NO. ${agencyGst}`, startX, doc.y + 4, { align: 'center' });
  doc.text(`PAN NO. ${agencyPan}`, startX, doc.y + 2, { align: 'center' });

  // --- Top Grid ---
  const gridTop = doc.y + 15;
  doc.lineWidth(1).strokeColor('#000000');
  
  // Outer box for Top Grid
  const gridHeight = 110;
  doc.rect(startX, gridTop, tableWidth, gridHeight).stroke();
  
  // Vertical Line splitting Left/Right
  // Align precisely with the line between 'Rate' and 'HSN CODE' in the items table below
  // Sum of widths before HSN CODE = 30 + 150 + 60 + 45 + 60 = 345
  const splitX = startX + 345;
  doc.moveTo(splitX, gridTop).lineTo(splitX, gridTop + gridHeight).stroke();

  // Horizontal Lines for the 4 rows spanning the entire grid width
  doc.moveTo(startX, gridTop + 20).lineTo(endX, gridTop + 20).stroke();
  doc.moveTo(startX, gridTop + 45).lineTo(endX, gridTop + 45).stroke();
  doc.moveTo(startX, gridTop + 80).lineTo(endX, gridTop + 80).stroke();
  
  // -- Left side texts --
  // Row 1: PARTY NAME
  doc.font('Helvetica-Bold').fontSize(10).text('PARTY NAME', startX + 5, gridTop + 5);
  
  // Row 2: Client Name
  doc.font('Helvetica-Bold').fontSize(12).text(client.name.toUpperCase(), startX + 5, gridTop + 28);
  
  // Row 3: Client Address
  doc.font('Helvetica').fontSize(8).text(`${client.address}, ${client.city}, ${client.state} ${client.postal_code || ''}`, startX + 5, gridTop + 50, { width: splitX - startX - 10 });
  
  // Row 4: GST & PAN
  doc.font('Helvetica-Bold').text(`GST NO. ${client.gst_number || 'N/A'}`, startX + 5, gridTop + 85);
  const clientPan = client.gst_number && client.gst_number.length >= 10 ? client.gst_number.substring(2, 12) : 'N/A';
  doc.text(`PAN NO. ${clientPan}`, startX + 5, gridTop + 97);

  // -- Right side texts --
  // Row 1
  doc.font('Helvetica-Bold').fontSize(11).text('INVOICE BILL', splitX + 5, gridTop + 5, { width: endX - splitX - 10, align: 'center' });
  
  // Row 2
  doc.text('RCM BILL', splitX + 5, gridTop + 28, { width: endX - splitX - 10, align: 'center' });
  
  // Row 3
  doc.font('Helvetica-Bold').fontSize(10).text(`INVOICE NO. ${invoice.invoice_number}`, splitX + 5, gridTop + 55);
  
  // Row 4
  const invDate = new Date(invoice.invoice_date);
  doc.text(`BILL DATE:- ${invDate.getDate().toString().padStart(2, '0')}-${(invDate.getMonth()+1).toString().padStart(2, '0')}-${invDate.getFullYear()}`, splitX + 5, gridTop + 90);

  // --- Items Table ---
  const tableTop = gridTop + gridHeight;
  
  // Define columns
  const cols = [
    { name: 'No.', w: 30 },
    { name: 'Particular', w: 150 },
    { name: 'Per Day\nRate', w: 60 },
    { name: 'No.of', w: 45 },
    { name: 'Rate', w: 60 },
    { name: 'HSN\nCODE', w: 55 },
    { name: 'Total\nDay', w: 45 },
    { name: 'Amount', w: 70 }
  ];

  // Draw Header Row
  doc.rect(startX, tableTop, tableWidth, 30).stroke();
  let currX = startX;
  cols.forEach((col, i) => {
    if (i > 0) doc.moveTo(currX, tableTop).lineTo(currX, tableTop + 30).stroke();
    doc.font('Helvetica-Bold').fontSize(8).text(col.name, currX, tableTop + 5, { width: col.w, align: 'center' });
    currX += col.w;
  });

  // Calculate values
  const isAdhoc = invoice.is_ad_hoc;
  const totalAmount = parseFloat(invoice.amount_subtotal) || 0;

  // Calculate billing period days
  let billingDays = 1;
  if (invoice.billing_period_start && invoice.billing_period_end) {
    const bStart = new Date(invoice.billing_period_start);
    const bEnd = new Date(invoice.billing_period_end);
    billingDays = Math.ceil((bEnd - bStart) / (1000 * 60 * 60 * 24)) + 1;
  }
  const totalDays = isAdhoc ? (invoice.duty_days_worked || 1) : billingDays;

  // For ad-hoc/event invoices, guards_count is passed. For monthly, derive from client's monthly_rate.
  // If the client's monthly_rate is the total contract value, noOfPersons can't be auto-derived.
  // We'll show the total as a single line item for monthly invoices.
  let noOfPersons = 1;
  if (isAdhoc && invoice.guards_count) {
    noOfPersons = parseInt(invoice.guards_count);
  } else if (client.monthly_rate && totalAmount > 0) {
    // For monthly: show 1 item = full contract amount
    noOfPersons = 1;
  }

  const ratePerPerson = noOfPersons > 0 && totalDays > 0
    ? (totalAmount / (noOfPersons * totalDays)).toFixed(2)
    : totalAmount.toFixed(2);
  const perDayRate = noOfPersons > 0
    ? (totalAmount / totalDays).toFixed(2)
    : '';
  const particularText = invoice.notes || (isAdhoc ? 'Bouncer / Guard' : 'Security Services');

  // Draw Data Row
  const rowH = 150; // Fixed height for items block
  doc.rect(startX, tableTop + 30, tableWidth, rowH).stroke();
  
  currX = startX;
  cols.forEach((col, i) => {
    if (i > 0) doc.moveTo(currX, tableTop + 30).lineTo(currX, tableTop + 30 + rowH).stroke();
    currX += col.w;
  });

  const dataY = tableTop + 35;
  currX = startX;
  
  // Col 1: No.
  doc.font('Helvetica').text('1', currX, dataY, { width: cols[0].w, align: 'center' });
  currX += cols[0].w;
  
  // Col 2: Particular
  doc.text(particularText, currX + 5, dataY, { width: cols[1].w - 10, align: 'left' });
  currX += cols[1].w;

  // Col 3: Per Day Rate
  doc.text(perDayRate, currX, dataY, { width: cols[2].w, align: 'center' });
  currX += cols[2].w;

  // Col 4: No.of
  doc.text(noOfPersons.toString(), currX, dataY, { width: cols[3].w, align: 'center' });
  currX += cols[3].w;

  // Col 5: Rate (Per person rate)
  doc.text(ratePerPerson.toString(), currX, dataY, { width: cols[4].w, align: 'center' });
  currX += cols[4].w;

  // Col 6: HSN
  doc.text(hsnCode, currX, dataY, { width: cols[5].w, align: 'center' });
  currX += cols[5].w;

  // Col 7: Total Day
  doc.text(totalDays.toString(), currX, dataY, { width: cols[6].w, align: 'center' });
  currX += cols[6].w;

  // Col 8: Amount
  doc.text(totalAmount.toFixed(2), currX - 5, dataY, { width: cols[7].w, align: 'right' });


  // --- Bottom Section (Totals and Bank Details) ---
  const bottomTop = tableTop + 30 + rowH;
  const bottomH = 100;
  doc.rect(startX, bottomTop, tableWidth, bottomH).stroke();
  
  const bottomSplitX = startX + (tableWidth - 170); // 170px for totals box
  doc.moveTo(bottomSplitX, bottomTop).lineTo(bottomSplitX, bottomTop + bottomH).stroke();

  // Left Side (Bank Details)
  doc.font('Helvetica-Bold').fontSize(9).text('Bank Details:-', startX + 5, bottomTop + 5);
  doc.font('Helvetica-Bold').fontSize(9).text(`NAME:- ${agencyName}`, startX + 5, bottomTop + 20);
  doc.text(`A/c No. ${getStr(agencySettings?.bank_account_number, '252528112019')}`, startX + 5, bottomTop + 35);
  doc.text(`Bank Name :- ${getStr(agencySettings?.bank_name, 'Indusind Bank')}`, startX + 5, bottomTop + 50);
  doc.text(`IFSC Code:- ${getStr(agencySettings?.bank_ifsc, 'INDB0000676')}`, startX + 5, bottomTop + 65);

  // Amount in words
  let amountInWords = '';
  try {
    amountInWords = converter.toWords(parseFloat(invoice.final_amount)).toUpperCase();
  } catch (e) {
    amountInWords = '---';
  }
  doc.moveTo(startX, bottomTop + 80).lineTo(tableWidth + startX, bottomTop + 80).stroke(); // Line above words
  doc.font('Helvetica-Bold').fontSize(8).text(`Rs in word:- ${amountInWords} RUPEES ONLY`, startX + 5, bottomTop + 85);

  // Right Side (Totals)
  const totalW = tableWidth - (bottomSplitX - startX); // 170
  let tY = bottomTop + 5;
  
  doc.font('Helvetica-Bold').fontSize(9);
  
  // Subtotal
  doc.text('TOTAL', bottomSplitX + 5, tY);
  doc.text(totalAmount.toFixed(2), bottomSplitX, tY, { width: totalW - 5, align: 'right' });
  tY += 15;
  doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke();
  tY += 5;

  // Taxes
  let finalAmt = parseFloat(invoice.final_amount);
  
  if (invoice.tax_type === 'cgst_sgst') {
    doc.text('SGST 9%', bottomSplitX + 5, tY);
    doc.text(parseFloat(invoice.sgst_amount).toFixed(2), bottomSplitX, tY, { width: totalW - 5, align: 'right' });
    tY += 15;
    doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke();
    tY += 5;
    
    doc.text('CGST 9%', bottomSplitX + 5, tY);
    doc.text(parseFloat(invoice.cgst_amount).toFixed(2), bottomSplitX, tY, { width: totalW - 5, align: 'right' });
    tY += 15;
    doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke();
    tY += 5;
  } else if (invoice.tax_type === 'igst') {
    doc.text('IGST 18%', bottomSplitX + 5, tY);
    doc.text(parseFloat(invoice.igst_amount).toFixed(2), bottomSplitX, tY, { width: totalW - 5, align: 'right' });
    tY += 15;
    doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke();
    tY += 5;
  } else if (parseFloat(invoice.tax_amount) > 0) {
    // legacy
    doc.text(`GST ${invoice.tax_rate}%`, bottomSplitX + 5, tY);
    doc.text(parseFloat(invoice.tax_amount).toFixed(2), bottomSplitX, tY, { width: totalW - 5, align: 'right' });
    tY += 15;
    doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke();
    tY += 5;
  } else {
    // If no tax, just push the space down
    tY += 35;
  }

  // Vertical line separating labels and amounts in totals
  doc.moveTo(endX - 70, bottomTop).lineTo(endX - 70, bottomTop + 80).stroke();

  // Grand Total
  // doc.moveTo(bottomSplitX, tY).lineTo(endX, tY).stroke(); // wait, line is drawn above already
  doc.font('Helvetica-Bold').fontSize(10).text('GROUND TOTAL', bottomSplitX + 5, bottomTop + 85);
  doc.text(finalAmt.toFixed(2), bottomSplitX, bottomTop + 85, { width: totalW - 5, align: 'right' });
  doc.moveTo(endX - 70, bottomTop + 80).lineTo(endX - 70, bottomTop + 100).stroke();

  // --- Footer / Signatures ---
  const footerTop = bottomTop + bottomH + 5;
  doc.font('Helvetica-Bold').fontSize(8).text(`Note:- Subject to ${jurisdictionCity} Jurisdiction Only.`, startX + 5, footerTop);
  doc.text('SERVICE', startX + 5, footerTop + 12);

  doc.text(`For, ${agencyName.toUpperCase()}`, startX, footerTop, { width: tableWidth, align: 'right' });
  
  // Seal and sign removed as per user request

  doc.end();
}

module.exports = {
  generateInvoicePDF
};
