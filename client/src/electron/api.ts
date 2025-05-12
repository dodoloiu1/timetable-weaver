import { ipcMain, type IpcMainInvokeEvent } from "electron";
import * as pdf from 'html-pdf';
import * as fs from 'fs';
import * as path from 'path';

ipcMain.handle(
  "node-version",
  (event: IpcMainInvokeEvent, msg: string): string => {
    console.log(event);
    console.log(msg);

    return process.versions.node;
  }
);

interface PdfResult {
  filename: string;
}

ipcMain.handle(
  "export-timetable-pdf",
  async (event: IpcMainInvokeEvent, data: { html: string, filename: string }): Promise<string> => {
    const { html, filename } = data;
    
    // Use user's documents folder as the target location
    const documentsPath = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Documents');
    const fullPath = path.join(documentsPath, filename);
    
    // Create temporary HTML file
    const tempHtmlPath = path.join(documentsPath, 'temp-timetable.html');
    fs.writeFileSync(tempHtmlPath, html);
    
    const options: pdf.PdfOptions = { 
      format: 'A4',
      orientation: 'landscape',
      border: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    };
    
    try {
      // Return a promise that resolves with the output filename
      return new Promise((resolve, reject) => {
        pdf.create(html, options).toFile(fullPath, (err: Error | null, res: PdfResult) => {
          if (err) {
            console.error("Error generating PDF:", err);
            reject(err.message);
          } else {
            console.log(`Timetable exported to ${fullPath}`);
            try {
              // Delete temporary HTML file after successful PDF generation
              fs.unlinkSync(tempHtmlPath);
            } catch (e) {
              console.warn("Could not remove temporary HTML file:", e);
            }
            resolve(fullPath);
          }
        });
      });
    } catch (error) {
      console.error("Error in PDF creation:", error);
      throw error;
    }
  }
);