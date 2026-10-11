// Electron Secure Preload Script
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  appVersion: "1.0.0"
});
