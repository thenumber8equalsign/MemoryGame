// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let userData;
let configFile;
let highScoreFile;
ipcRenderer.invoke("getUserDataPath").then((response) => {
  userData = response;
  configFile = path.join(userData, "config.json");
  highScoreFile = path.join(userData, "highScore.json");
});

const defaultConfiguration = JSON.stringify(
  {
    timeToMemorize: 1000,
    comment1: "The time you have to memorize the numbers in milliseconds",
    timeout: 30,
    comment2: "The time you have to enter the the numbers in seconds",
    length: 8,
    comment3: "The length of the string of numbers",
  },
  null,
  2,
); // 2 spaces tab

function createConfig() {
  console.log("Creating config file at", configFile);
  try {
    fs.writeFileSync(configFile, defaultConfiguration);
  } catch (err) {
    throw err;
  }
}

contextBridge.exposeInMainWorld("electron", {
  createConfig: createConfig,
  getConfig: () => {
    if (!fs.existsSync(configFile)) {
      try {
        createConfig();
      } catch (err) {
        console.error("Could not create config file:", err);
        throw err;
      }
    }
    return configFile;
  },
  getHighScore: () => {
    // If the file does not exist, return 0
    if (!fs.existsSync(highScoreFile)) return 0;

    let highScore;
    try {
      highScore = fs.readFileSync(highScoreFile, "utf-8");
    } catch (err) {
      console.error("Could not read from config file:", err);
      throw err;
    }
    return highScore;
  },
  writeHighScore: (highScore) => {
    let highScoreBody = JSON.stringify(
      {
        highScore: highScore,
      },
      null,
      2,
    );

    try {
      fs.writeFileSync(highScoreFile, highScoreBody);
    } catch (err) {
      console.error("Could not write to config file:", err);
      throw err;
    }
  },
  openConfigFile: () => {
    shell.openPath(configFile);
  },
  resetConfig: async () => {
    const result = await ipcRenderer.invoke("resetConfigMessage");
    // 0 is the id of the cancel button, 1 is the id of the yes button

    if (result === 1) {
      try {
        createConfig();
      } catch (err) {
        console.error("Could not create config file:", err);
        throw err;
      }
    }
  },
});
