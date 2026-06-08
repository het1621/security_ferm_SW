const PDFDocument = require('pdfkit');

function generatePayslipPDF(payroll, employee, client, dataCallback, endCallback) {
  const doc = new PDFDocument({ margin: 50 });
  
  doc.on('data', dataCallback);
  doc.on('end', endCallback);
  
  // Header
  doc
    .fillColor('#334155')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('PAYSLIP', 50, 50, { align: 'right' });
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Month: ${new Date(payroll.payroll_month).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 50, 80, { align: 'right' })
    .text(`Date Generated: ${new Date().toLocaleDateString('en-IN')}`, 50, 95, { align: 'right' });

  // Company Info
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('Security Firm Services', 50, 50);
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('123 Security Avenue, Business Park', 50, 75)
    .text('Ahmedabad, Gujarat 380015', 50, 90);

  doc.moveDown(3);

  // Employee Details (Left)
  const empTop = doc.y;
  
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#334155')
    .text('Employee Details:', 50, empTop);
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#0f172a')
    .text(`Name: ${employee.full_name}`, 50, empTop + 20)
    .text(`Employee ID: ${employee.employee_id}`, 50, empTop + 35)
    .text(`Designation: ${employee.designation}`, 50, empTop + 50)
    .text(`Assigned Site: ${client ? client.name : 'Unassigned'}`, 50, empTop + 65)
    .text(`UAN / PF No: ${employee.aadhar_number || 'N/A'}`, 50, empTop + 80)
    .text(`PAN: ${employee.pan_number || 'N/A'}`, 50, empTop + 95);

  // Attendance Details (Right)
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#334155')
    .text('Attendance Summary:', 350, empTop);
    
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#0f172a')
    .text(`Total Days in Month: ${payroll.days_in_month}`, 350, empTop + 20)
    .text(`Days Worked: ${payroll.days_worked}`, 350, empTop + 35)
    .text(`Days Absent: ${payroll.days_absent}`, 350, empTop + 50)
    .text(`Days Leave: ${payroll.days_leave}`, 350, empTop + 65);

  doc.moveDown(4);
  const tableTop = doc.y;

  // Earnings Table (Left half)
  doc.font('Helvetica-Bold');
  generateTableRow(doc, tableTop, 'Earnings', 'Amount', 50, 250, '#f0f9ff', '#0369a1');
  
  let leftY = tableTop + 30;
  doc.font('Helvetica');
  generateTableRow(doc, leftY, 'Basic Salary', `Rs ${Number(payroll.base_salary).toLocaleString('en-IN')}`, 50, 250, '#ffffff', '#334155');
  leftY += 25;
  if (Number(payroll.da_amount) > 0) {
    generateTableRow(doc, leftY, 'Dearness Allowance (DA)', `Rs ${Number(payroll.da_amount).toLocaleString('en-IN')}`, 50, 250, '#ffffff', '#334155');
    leftY += 25;
  }
  if (Number(payroll.hra_amount) > 0) {
    generateTableRow(doc, leftY, 'House Rent Allowance (HRA)', `Rs ${Number(payroll.hra_amount).toLocaleString('en-IN')}`, 50, 250, '#ffffff', '#334155');
    leftY += 25;
  }
  if (Number(payroll.other_allowances) > 0) {
    generateTableRow(doc, leftY, 'Other Allowances', `Rs ${Number(payroll.other_allowances).toLocaleString('en-IN')}`, 50, 250, '#ffffff', '#334155');
    leftY += 25;
  }

  // Deductions Table (Right half)
  doc.font('Helvetica-Bold');
  generateTableRow(doc, tableTop, 'Deductions', 'Amount', 310, 240, '#fef2f2', '#b91c1c');
  
  let rightY = tableTop + 30;
  doc.font('Helvetica');
  if (Number(payroll.pf_deduction) > 0) {
    generateTableRow(doc, rightY, 'Provident Fund (PF)', `Rs ${Number(payroll.pf_deduction).toLocaleString('en-IN')}`, 310, 240, '#ffffff', '#334155');
    rightY += 25;
  }
  if (Number(payroll.esi_deduction) > 0) {
    generateTableRow(doc, rightY, 'ESI', `Rs ${Number(payroll.esi_deduction).toLocaleString('en-IN')}`, 310, 240, '#ffffff', '#334155');
    rightY += 25;
  }
  if (Number(payroll.tax_deduction) > 0) {
    generateTableRow(doc, rightY, 'Professional Tax / TDS', `Rs ${Number(payroll.tax_deduction).toLocaleString('en-IN')}`, 310, 240, '#ffffff', '#334155');
    rightY += 25;
  }
  if (Number(payroll.other_deductions) > 0) {
    generateTableRow(doc, rightY, 'Other Deductions / Advances', `Rs ${Number(payroll.other_deductions).toLocaleString('en-IN')}`, 310, 240, '#ffffff', '#334155');
    rightY += 25;
  }

  const maxY = Math.max(leftY, rightY);
  const totalsTop = maxY + 10;

  // Gross Totals
  doc.font('Helvetica-Bold');
  generateTableRow(doc, totalsTop, 'Gross Earnings', `Rs ${Number(payroll.gross_salary).toLocaleString('en-IN')}`, 50, 250, '#f8fafc', '#0f172a');
  generateTableRow(doc, totalsTop, 'Total Deductions', `Rs ${Number(payroll.total_deductions).toLocaleString('en-IN')}`, 310, 240, '#f8fafc', '#0f172a');

  // Net Pay
  const netPayTop = totalsTop + 50;
  doc.rect(50, netPayTop, 500, 40).fill('#0f766e');
  doc.fillColor('#ffffff').fontSize(14).text('Net Payable Salary', 60, netPayTop + 13);
  doc.fillColor('#ffffff').fontSize(16).text(`Rs ${Number(payroll.net_salary).toLocaleString('en-IN')}`, 450, netPayTop + 12, { width: 90, align: 'right' });

  // Bank details
  doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text('Bank Account Details for Transfer:', 50, netPayTop + 60);
  doc.font('Helvetica').text(`Bank Name: ${employee.bank_name || 'N/A'}`, 50, netPayTop + 75);
  doc.text(`A/C No: ${employee.bank_account_number || 'N/A'}`, 50, netPayTop + 90);
  doc.text(`IFSC: ${employee.bank_ifsc_code || 'N/A'}`, 50, netPayTop + 105);

  // Footer
  doc.fontSize(9).fillColor('#94a3b8').text('This is a computer-generated document and does not require a signature.', 50, 720, { align: 'center' });

  doc.end();
}

function generateTableRow(doc, y, label, value, x, width, bgColor, textColor) {
  if (bgColor !== '#ffffff') {
    doc.rect(x, y - 5, width, 25).fill(bgColor);
  }
  doc.fillColor(textColor).text(label, x + 10, y + 2);
  doc.text(value, x + width - 100, y + 2, { width: 90, align: 'right' });
}

module.exports = {
  generatePayslipPDF
};
