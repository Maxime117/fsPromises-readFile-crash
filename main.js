"use strict"

/*************************************************************************
* Constants
*/

const path = require("path");
const electron = require("electron");
const {app, BrowserWindow, protocol} = electron;

let browserWindows = new Map();

initialize();

app.whenReady().then(onReady);

////////////

function initialize() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "live",
      privileges: {
        standard: true,
        secure: true,
        allowServiceWorkers: true,
        bypassCSP: true
      }
    }
  ]);
}

function onReady() {
  protocol.registerFileProtocol("live", registerFileRequest)

  createMainWindow();
}

function registerFileRequest(request, callback){
  let [url, params] = request.url.split("?");
  let uri = url.match(/^live:\/\/debug\/(.*)$/)[1];
  let nodeModulesRegex = /.*node_modules\/(.*)/;
  let mediaCacheRegex = new RegExp(".*" + encodeURI(path.resolve("Media")) + "\/(.*)");
 
  // console.log("registerFileRequest — url: %s  uri: %s", url, uri);

  if(nodeModulesRegex.test(uri)){
    let [, filepath] = uri.match(nodeModulesRegex);
    return callback({path: path.resolve("node_modules", filepath)});
  }

  if(mediaCacheRegex.test(url)){
    let [, filepath] = url.match(mediaCacheRegex);
    return callback({path: path.resolve(path.resolve("Media"), decodeURI(filepath))});
  }

  callback({path: path.resolve(__dirname, uri)});
}

/*************************************************************************
* Windows definition
*/

function createMainWindow (caller) {
  let win = new BrowserWindow({
    width: electron.screen.getPrimaryDisplay().workAreaSize.width,
    height: electron.screen.getPrimaryDisplay().workAreaSize.height,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    backgroundColor: "#000000",
    fullscreenable: true,
    acceptFirstMouse: true,
    webPreferences:{
      nativeWindowOpen: true,
      devTools: true,
      textAreasAreResizable: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      autoplayPolicy: "no-user-gesture-required",
      contextIsolation: false
    }
  })

  win.setSheetOffset(48);

  win.loadURL("live://debug/main.html");

  // Open Dev tools for debug
  win.webContents.openDevTools();

  browserWindows.set("main", win);

  win.webContents.setWindowOpenHandler(({frameName, url}) => {
    if(url === "live://debug/child.html" && browserWindows.has("child") && !browserWindows.get("child").isDestroyed()) {
      return {
        action: "deny"
      }
    }

    const config = {
      action: "allow",
      overrideBrowserWindowOptions: {
        width: 900,
        height: 528,
        minWidth: 640,
        minHeight: 360,
        show: false,
        backgroundColor: "#000000",
        titleBarStyle: "default",
        fullscreenable: true,
        webPreferences: {
          devTools: true,
          textAreasAreResizable: false,
          nodeIntegration: true,
          enableRemoteModule: true,
          autoplayPolicy: "no-user-gesture-required"
        }
      }
    }

    return config;
  })

  win.webContents.once("did-finish-load", function() {
    win.show();
  })

  win.once("closed", e => {
    browserWindows.delete("main");
  });

  win.webContents.on("did-create-window", (childWindow, details) => {
    if(details.url === "live://debug/child.html" && !browserWindows.has("child")) {
      createChildWindow(win, childWindow);
    }
  })
}

function createChildWindow(parentWindow, childWindow) {
  childWindow.setAspectRatio(16/9);
  childWindow.setBackgroundThrottling(false);

  browserWindows.set("child", childWindow);

  childWindow.webContents.once("did-finish-load", function() {
    childWindow.show();
  })
}