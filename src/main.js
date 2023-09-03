const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

import Documents from './main/documents';
import Questions from './main/questions';
import Settings from './main/settings';
import Ai from './main/ai';
import Messages from './main/messages';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

/**
 *
 * @param {*} channel
 * @param {*} handler
 */
function RegisterHandler(channel, handler) {
  ipcMain.handle(channel, (_, args) => {
    const method = args.shift();
    const type   = typeof handler[method];

    return type === 'function' ? handler[method](...args) : undefined;
  });
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname + '/../assets/icon.png')
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  RegisterHandler('documents', Documents);
  RegisterHandler('questions', Questions);
  RegisterHandler('settings', Settings);
  RegisterHandler('ai', Ai);
  RegisterHandler('messages', Messages);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
