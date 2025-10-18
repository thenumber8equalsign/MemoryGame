// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer, shell } = require("electron");
const Ajv = require("ajv");
const fs = require("node:fs");
const path = require("node:path");

const ajv = new Ajv();

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
    comment2:
      "The time you have to enter the the numbers in seconds, 0 or less to disable",
    length: 8,
    comment3: "The length of the string of numbers",
    allowNonBinaryDigits: false,
    comment4: "Whether or not to use digits other than 0 or 1",
    useCustomChars: false,
    comment5:
      "Wheter or not to select characters or digits from the array below",
    customChars: "0123456789",
    comment6:
      "The characters to choose from, only used if useCustomChars is set to true, set to [] to use any ASCII character",
  },
  null,
  2,
); // 2 spaces tab

const configSchema = {
  type: "object",
  properties: {
    timeToMemorize: { type: "number" },
    timeout: { type: "number" },
    length: { type: "number" },
    allowNonBinaryDigits: { type: "boolean" },
    useCustomChars: { type: "boolean" },
    customChars: {
      type: "string",
    },
  },
  required: [
    "timeToMemorize",
    "timeout",
    "length",
    "allowNonBinaryDigits",
    "useCustomChars",
    "customChars",
  ],
};
const configValidate = ajv.compile(configSchema);

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
    } else {
      // What we do now is just make sure the configuration is valid
      let config;
      try {
        config = fs.readFileSync(configFile, "utf-8");
      } catch (err) {
        console.error("Could not read from config file:", err);
        throw err;
      }

      try {
        config = JSON.parse(config);
      } catch (err) {
        console.error(
          "Config file is not valid JSON, a new one will be created",
        );
        try {
          createConfig();
        } catch (err) {
          console.error("Could not create config file:", err);
          throw err;
        }
        return configFile;
      }

      // Config is invalid
      if (!configValidate(config)) {
        console.error(
          "Config file is not a valid configuration, a new one will be generated",
        );
        try {
          createConfig();
        } catch (err) {
          console.error("Could not create config file:", err);
          throw err;
        }
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
      console.error("Could not read from high score file:", err);
      throw err;
    }

    // if it is not valid json, return 0;
    try {
      highScore = JSON.parse(highScore);
    } catch (err) {
      console.error("High score file is not valid JSON");
      return 0;
    }

    // if the highScore property is not set, or it is not a number, return 0
    if (
      highScore.highScore == undefined ||
      highScore.highScore == null ||
      !Number.isInteger(highScore.highScore)
    ) {
      console.error("High score file is not valid");
      return 0;
    }

    return highScore.highScore;
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
      console.error("Could not write to high score file:", err);
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
  onConfigChange: (callbackFunction) => {
    fs.watch(configFile, (eventType, filename) => {
      if (eventType == "change") {
        callbackFunction();
      }
    });
  },
});
