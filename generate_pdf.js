const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Don't show the window
        webPreferences: {
            nodeIntegration: true
        }
    });

    const htmlPath = 'file://' + path.join(__dirname, 'presentation_v1.2.2.html');
    await win.loadURL(htmlPath);

    // Wait a bit for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        const pdfData = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            marginsType: 1 // No margin
        });
        
        fs.writeFileSync(path.join(__dirname, 'Security_Firm_Presentation_v1.2.2.pdf'), pdfData);
        console.log('PDF generated successfully: Security_Firm_Presentation_v1.2.2.pdf');
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }

    app.quit();
});
