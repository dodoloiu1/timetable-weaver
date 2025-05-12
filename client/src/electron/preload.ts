import { contextBridge, ipcRenderer } from "electron";

export const backend = {
  nodeVersion: async (msg: string): Promise<string> =>
    await ipcRenderer.invoke("node-version", msg),
  exportTimetablePdf: async (html: string, filename: string): Promise<string> =>
    await ipcRenderer.invoke("export-timetable-pdf", { html, filename }),
};

contextBridge.exposeInMainWorld("backend", backend);