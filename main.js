const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pngToIco = require('png-to-ico');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: "Image Converter Pro",
    backgroundColor: '#1e1e2e'
  });

  win.loadFile('index.html');
  // win.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler for saving standard images
ipcMain.handle('save-file', async (event, { buffer, defaultPath }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath,
      filters: [
        { name: 'Images', extensions: [defaultPath.split('.').pop()] }
      ]
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return { success: true, filePath };
    }
    return { success: false, canceled: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler for converting PNG buffer to ICO
ipcMain.handle('save-ico', async (event, { buffer, defaultPath }) => {
    try {
        const { canceled, filePath: finalPath } = await dialog.showSaveDialog({
            title: 'Save Icon File',
            defaultPath,
            filters: [{ name: 'Icon File', extensions: ['ico'] }]
        });

        if (!canceled && finalPath) {
            // Write to temp file because png-to-ico might behave more predictably with buffers via files
            const tempPngPath = path.join(os.tmpdir(), `temp_ico_gen_${Date.now()}.png`);
            fs.writeFileSync(tempPngPath, Buffer.from(buffer));
            
            const buf = await pngToIco(tempPngPath);
            fs.writeFileSync(finalPath, buf);
            fs.unlinkSync(tempPngPath); // Clean up temp file
            
            return { success: true, filePath: finalPath };
        }
        return { success: false, canceled: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
