const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    backgroundColor: "#0F172A",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    // Development: try localhost first, fallback to built dist
    const devUrl = process.env.ELECTRON_START_URL || "http://localhost:5173";
    window.loadURL(devUrl).catch(() => {
      window.loadFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // Production: load from electron dist directory
    window.loadFile(path.join(__dirname, "dist", "index.html"));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
