// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let userData;
let configFile;
ipcRenderer.invoke("getUserDataPath").then((response) => {
  userData = response;
  configFile = path.join(userData, "config.json");
});
const defaultConfiguration = `{
"timeToMemorize": 1000,
"timeout": 30,
"length": 8
}`;

contextBridge.exposeInMainWorld("electron", {
  getConfig: async () => {
    if (!fs.existsSync(configFile)) {
      // config file does not exist
      console.log("Creating config file at", configFile);
      try {
        fs.writeFileSync(configFile, defaultConfiguration);
      } catch (err) {
        console.error("Error, could not create config file:", err);
        throw err;
      }
    }
    return configFile;
  },
  writeHighScore: (highScore) => {
    let config;
    try {
      config = fs.readFileSync(configFile, "utf-8");
    } catch (err) {
      console.error("Could not read config file,", err);
      throw err;
    }

    config = JSON.parse(config);
    config.highScore = highScore;
    config = JSON.stringify(config, null, 2); // 2 spaces for tab

    try {
      fs.writeFileSync(configFile, config);
    } catch (err) {
      console.error("Could not write to config file,", err);
      throw err;
    }
  },
});
