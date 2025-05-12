import { ipcMain, type IpcMainInvokeEvent, dialog, BrowserWindow } from "electron";
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

// Show save dialog and return the selected file path
ipcMain.handle(
  "show-save-dialog",
  async (event: IpcMainInvokeEvent, defaultPath: string): Promise<string | null> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    
    if (!window) {
      throw new Error("Could not find window");
    }
    
    const result = await dialog.showSaveDialog(window, {
      title: "Save Timetable PDF",
      defaultPath,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"]
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.filePath;
  }
);

ipcMain.handle(
  "export-timetable-pdf",
  async (event: IpcMainInvokeEvent, data: { html: string, filePath: string }): Promise<string> => {
    const { html, filePath } = data;
    
    if (!filePath) {
      throw new Error("No file path provided");
    }
    
    // Create directory if it doesn't exist
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Create temporary HTML file in the same directory
    const tempHtmlPath = path.join(directory, 'temp-timetable.html');
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
        pdf.create(html, options).toFile(filePath, (err: Error | null, res: PdfResult) => {
          if (err) {
            console.error("Error generating PDF:", err);
            reject(err.message);
          } else {
            console.log(`Timetable exported to ${filePath}`);
            try {
              // Delete temporary HTML file after successful PDF generation
              fs.unlinkSync(tempHtmlPath);
            } catch (e) {
              console.warn("Could not remove temporary HTML file:", e);
            }
            resolve(filePath);
          }
        });
      });
    } catch (error) {
      console.error("Error in PDF creation:", error);
      throw error;
    }
  }
);