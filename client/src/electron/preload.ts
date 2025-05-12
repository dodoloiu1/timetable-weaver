import { contextBridge, ipcRenderer } from "electron";

export const backend = {
  nodeVersion: async (msg: string): Promise<string> =>
    await ipcRenderer.invoke("node-version", msg),
  showSaveDialog: async (defaultPath: string): Promise<string | null> =>
    await ipcRenderer.invoke("show-save-dialog", defaultPath),
  exportTimetablePdf: async (html: string, filePath: string): Promise<string> =>
    await ipcRenderer.invoke("export-timetable-pdf", { html, filePath }),
};

contextBridge.exposeInMainWorld("backend", backend);