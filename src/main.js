const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path                                    = require('path');
const _                                       = require('lodash');

const Documents     = require('./../../src/main/documents');
const Questions     = require('./../../src/main/questions');
const Settings      = require('./../../src/main/settings');
const Ai            = require('./../../src/main/ai');
const Conversations = require('./../../src/main/conversations');
const Tuning        = require('./../../src/main/tuning');
const Bridge        = require('./../../src/main/bridge');
const Email         = require('./../../src/main/email');
const Addons        = require('./../../src/main/addons');
const Debug         = require('./../../src/main/libs/debug');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

if (process.platform === 'darwin' && process.arch === 'x64') {
	app.disableHardwareAcceleration()
}

/**
 *
 * @param {*} channel
 * @param {*} handler
 */
function RegisterHandler(channel, handler) {
  ipcMain.handle(channel, (event, args) => {
    let response;

    const method = args.shift();

    if (_.isFunction(handler[method])) {
      // If function is async, then register catch
      if (handler[method].constructor.name === 'AsyncFunction') {
        response = handler[method](...args).catch((error) => {
          Debug.error(channel, method, args, error);

          response = new Error(error.message);
        });
      } else {
        try {
          response = handler[method](...args);
        } catch (error) {
          Debug.error(channel, method, args, error);

          response = new Error(error.message);
        }
      }
    } else {
      response = new Error(`Channel ${channel} does not have ${method} method`);

      Debug.error(channel, method, args, response);
    }

    return response;
  });
}

/**
 *
 */
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
  // mainWindow.webContents.openDevTools();

  RegisterHandler('documents', Documents);
  RegisterHandler('questions', Questions);
  RegisterHandler('settings', Settings);
  RegisterHandler('ai', Ai);
  RegisterHandler('conversations', Conversations);
  RegisterHandler('tuning', Tuning);
  RegisterHandler('addons', Addons);
  RegisterHandler('email', Email);

  // Finally load add-ons
  Bridge.init();
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

// Set the app protocol pq://
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      'pq',
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  }
} else {
  app.setAsDefaultProtocolClient('pq')
}

app.on('open-url', async (event, url) => Email.processCallback(url))