const fs = require('fs');
const path = require('path');

// Ensure DB_PATH is set before connection loads
process.env.DB_PATH = require('os').homedir() + '\\AppData\\Roaming\\secuirty-agency-software\\database.sqlite';

const { query } = require('../src/database/connection');
const pdfGenerator = require('../src/utils/pdfGenerator');
const payslipGenerator = require('../src/utils/payslipGenerator');

async function generateSamples() {
  try {
    console.log('Fetching sample data from database...');
    
    // 1. Fetch a real invoice and client
    const invoiceResult = await query("SELECT * FROM invoices LIMIT 1");
    if (invoiceResult.rows.length === 0) {
      console.log('No invoices found in DB. Skipping invoice sample.');
    } else {
      const invoice = invoiceResult.rows[0];
      const clientResult = await query("SELECT * FROM clients WHERE id = $1", [invoice.client_id]);
      const client = clientResult.rows[0];
      
      const agencySettingsResult = await query("SELECT setting_key, setting_value FROM system_settings");
      const agencySettings = {};
      agencySettingsResult.rows.forEach(r => agencySettings[r.setting_key] = r.setting_value);
      
      const invoicePdfPath = path.join(__dirname, 'Sample_Invoice.pdf');
      const writeStream = fs.createWriteStream(invoicePdfPath);
      
      pdfGenerator(
        invoice, 
        client, 
        agencySettings, 
        (chunk) => writeStream.write(chunk), 
        () => {
          writeStream.end();
          console.log(`✅ Sample Invoice generated: ${invoicePdfPath}`);
        }
      );
    }
    
    // 2. Fetch a real payslip and employee
    const payrollResult = await query("SELECT * FROM payroll LIMIT 1");
    if (payrollResult.rows.length === 0) {
      console.log('No payroll records found in DB. Skipping payslip sample.');
    } else {
      const payroll = payrollResult.rows[0];
      const empResult = await query("SELECT * FROM employees WHERE id = $1", [payroll.employee_id]);
      const employee = empResult.rows[0];
      
      const payslipPdfPath = path.join(__dirname, 'Sample_Payslip.pdf');
      const writeStream = fs.createWriteStream(payslipPdfPath);
      
      payslipGenerator(
        payroll, 
        employee, 
        (chunk) => writeStream.write(chunk), 
        () => {
          writeStream.end();
          console.log(`✅ Sample Payslip generated: ${payslipPdfPath}`);
        }
      );
    }
    
  } catch (error) {
    console.error('Error generating samples:', error);
  }
}

generateSamples();
