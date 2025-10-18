// Buttons
const newRoundButton = document.getElementById("newRoundButton");
const howToPlayButton = document.getElementById("howToPlay");
const submitButton = document.getElementById("submitButton");
const optionsButton = document.getElementById("optionsButton");

const inputField = document.getElementById("byteInput");
const byteDisplay = document.getElementById("byteDisplay");
const scoreField = document.getElementById("score");
const highScoreField = document.getElementById("highScore");
const countdownField = document.getElementById("timeRemaining");

const body = document.getElementsByTagName("body")[0];

newRoundButton.addEventListener("click", newRound);
howToPlayButton.addEventListener("click", howToPlay);
submitButton.addEventListener("click", submit);
optionsButton.addEventListener("click", showOptions);

// Modal
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeSpan = document.getElementById("closeModal");

closeSpan.addEventListener("click", closeModal);

// When the user clicks anywhere outside modalContent, close it
modal.addEventListener("click", (event) => {
  if (!modalContent.contains(event.target)) {
    closeModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code == "Escape") {
    closeModal();
  } else if (
    event.code == "Enter" &&
    submitButton.getAttribute("disabled") == null &&
    (document.activeElement == body || document.activeElement == inputField)
  ) {
    submit();
  } else if (
    event.code == "Enter" &&
    submitButton.getAttribute("disabled") != null &&
    newRoundButton.getAttribute("disabled") == null &&
    document.activeElement == body
  ) {
    newRound();
  }
});

let CONFIG = {};
let CONFIG_FILE_PATH = "";
let highScore = 0;
let score = 0;
let answer;

let timerID; // this stores the id for the interval for the countdown, allowing us to stop it from other places

window.onload = () => {
  refreshConfig();
  refreshHighScore();
  window.electron.onConfigChange(() => {
    console.log("Configuration changed");
    refreshConfig(false); // Don't reset the timeout text because a round may or may not be going on
  });
};

function generateString() {
  let str = "";
  // If the configuration tells us to use the custom characters, use them
  if (CONFIG.useCustomChars) {
    for (let i = 0; i < CONFIG.length; ++i) {
      if (CONFIG.customChars.length == 0) {
        // use any ascii character, range [33, 126] because 127 is delete and 32 is space, and the rest are control characters
        // we need to generate a random integer within [0, 93] because 126 - 33 = 93, and then add an offset of 33
        str += String.fromCharCode(Math.floor(Math.random() * 94) + 33);
      } else {
        let index = Math.floor(Math.random() * CONFIG.customChars.length);
        str += CONFIG.customChars.charAt(index);
      }
    }
  } else {
    for (let i = 0; i < CONFIG.length; ++i) {
      if (CONFIG.allowNonBinaryDigits) {
        str += Math.floor(Math.random() * 10).toString(); // Generates a digit within [0, 9]
      } else {
        str += Math.floor(Math.random() * 2).toString(); // Generates either 0 or 1
      }
    }
  }
  return str;
}

async function refreshConfig(resetTimerText = true) {
  const configPath = window.electron.getConfig();
  const response = await fetch(configPath);
  CONFIG = await response.json();
  Object.freeze(CONFIG);
  CONFIG_FILE_PATH = configPath;

  // Set the countdown text
  if (resetTimerText) {
    countdownField.innerHTML = `<span>Time remaining<br />--</span>`;
  }
}

function refreshHighScore() {
  highScore = window.electron.getHighScore();
  highScoreField.innerHTML = h`<span>High score<br />${highScore}</span>`;
}

function saveHighScore() {
  window.electron.writeHighScore(highScore);
}

function newRound() {
  newRoundButton.setAttribute("disabled", true); // disable the new round button so there aren't multiple rounds at the same time
  inputField.setAttribute("disabled", true);
  answer = generateString();

  byteDisplay.value = answer;

  setTimeout(() => {
    inputField.removeAttribute("disabled");
    submitButton.removeAttribute("disabled");
    // Focus the inputField, this makes it easier for keyboard users
    inputField.focus();

    byteDisplay.value = "";
    // If the user disabled the timeout in the configuration, then don't do it
    if (CONFIG.timeout > 0) {
      let timeLeft = CONFIG.timeout - 1;
      countdownField.innerHTML = h`<span>Time remaining<br />${timeLeft + 1}</span>`;

      timerID = setInterval(() => {
        if (timeLeft == -1) {
          clearInterval(timerID);
          timerID = undefined;
          endGame(false);
        } else {
          countdownField.innerHTML = h`<span>Time remaining<br />${timeLeft}</span>`;
          --timeLeft;
        }
      }, 1000);
    } else {
      timerID = undefined;
    }
  }, CONFIG.timeToMemorize);
}

function submit() {
  const submittedValue = inputField.value.trim();
  if (submittedValue === answer) {
    endGame(true);
  } else {
    endGame(false);
  }
}

// won is a bool that stores if the game was won
function endGame(won) {
  if (timerID !== undefined) {
    clearInterval(timerID);
    timerID = undefined;
  }

  newRoundButton.removeAttribute("disabled");
  inputField.setAttribute("disabled", true);
  submitButton.setAttribute("disabled", true);

  inputField.value = "";

  document.getElementById("timeRemaining").innerHTML =
    `<span>Time remaining<br />--</span>`;

  if (won == true) {
    byteDisplay.value = "You won!";
    ++score;
    if (score > highScore) {
      highScore = score;
    }
  } else {
    // Game lost
    byteDisplay.value = "You lost!";
    // reset the score
    score = 0;
  }

  scoreField.innerHTML = h`<span>Score<br />${score}</span>`;
  highScoreField.innerHTML = h`<span>High score<br />${highScore}</span>`;
}

function showOptions() {
  closeModal(); // Close the modal in case there is already stuff in it

  const html = `<h2 style="text-align: center">Options</h2>
    <button class="greenField" onclick="saveHighScore()" style="
    margin: 10px auto 10px auto;
    ">Save high score</button>
    <button class="greenField" onclick="refreshConfig()" style="
    margin: 10px auto 10px auto;
    ">Reload configuration</button>
    <button class="greenField" onclick="window.electron.openConfigFile()" style="
    margin: 10px auto 10px auto;
    ">Open configuration file in text editor</button>
    <button class="greenField" onclick="window.electron.resetConfig()" style="
    margin: 10px auto 10px auto;
    ">Reset configuration to default</button>
    <button class="greenField" onclick="changeConfig(event)" style="
    margin: 10px auto 10px auto;
    ">Change configuration</button>`;
  closeSpan.insertAdjacentHTML("afterend", html);
  showModal();
}

function howToPlay() {
  closeModal(); // Close the modal in case there is already stuff in it

  const html = h`<h2 style="text-align: center">How to play</h2>
  <p style="text-align: center">
    1. Hit the new round button<br />
    2. Memorize the numbers shown in the field<br />
    3. Type them back in<br />
    4. Hit enter<br />
    Note: You can edit the configuration at<br /><span>${CONFIG_FILE_PATH}</span>
    <br />
    Also, if you break the configuration, it will be fine, as the app will automatically regenerate a configuration if it is invalid.
  </p>`;

  closeSpan.insertAdjacentHTML("afterend", html);
  showModal();
}

function changeConfig(event) {
  clearModal(); // We will use the modal for the menu
  const html = `<h2 style="text-align: center">Configure game</h2>
    <form id="configChangeForm" style="
    display: grid;
    grid-template-columns: 1fr 1fr;
    text-align: center;
    align-items: center;
    justify-content: center;
    row-gap: 10px;
    ">
      <label for="timeToMemorize"><span title="The time you have to memorize the characters, in milliseconds">&#x24D8;</span> Time to memorize</label>
      <input id="timeToMemorize" name="timeToMemorize" style="width: 80%;" type="number" min="1" required/>
      <label for="timeout"><span title="The amount of time you have to type back in the characters (0 or less to disable), in seconds">&#x24D8;</span> Timeout</label>
      <input id="timeout" name="timeout" style="width: 80%;" type="number" required/>
      <label for="length"><span title="The length of string that is displayed">&#x24D8;</span> Length</label>
      <input id="length" name="length" style="width: 80%;" type="number" min="1" required/>
      <label for="allowNonBinaryDigits"><span title="Whether or not to use digits other than 0 or 1">&#x24D8;</span> Use non-binary digits</label>
      <label class="customCheckbox">
        <input id="allowNonBinaryDigits" name="allowNonBinaryDigits" type="checkbox" />
        <span class="checkmark"></span>
      </label>
      <label for="useCustomChars"><span title="Whether or not to use characters from the list below">&#x24D8;</span> Use custom characters</label>
      <label class="customCheckbox">
        <input id="useCustomChars" name="useCustomChars" type="checkbox" />
        <span class="checkmark"></span>
      </label>
      <label for="customChars"><span title="The characters to choose from, only used if &quot;Use custom characters&quot; is checked\nMake empty to use any ASCII character within [33, 126]\nType in every character here at once without seperation">&#x24D8;</span> Custom characters</label>
      <input id="customChars" name="customChars" style="width: 80%" />
      <div style="display: flex; justify-content: center; align-items: center; grid-column: 1 / -1">
      <button type="submit" class="greenField">Save</button>
      </div>
      </form>`;
  closeSpan.insertAdjacentHTML("afterend", html);
  showModal();
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }

  const form = document.getElementById("configChangeForm");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (form.reportValidity()) {
      saveConfig();
    }
  });

  // Populate the form with the current values
  document.getElementById("timeToMemorize").value = CONFIG.timeToMemorize;
  document.getElementById("timeout").value = CONFIG.timeout;
  document.getElementById("length").value = CONFIG.length;
  document.getElementById("allowNonBinaryDigits").checked =
    CONFIG.allowNonBinaryDigits;
  document.getElementById("useCustomChars").checked = CONFIG.useCustomChars;
  document.getElementById("customChars").value = CONFIG.customChars;
}

function saveConfig() {
  const form = document.getElementById("configChangeForm");
  const formData = new FormData(form);
  const obj = Object.fromEntries(formData);

  // Now handle the checkboxes manually because for some reason they don't work automatically
  const useNonBinaryDigitsCheckbox = document.getElementById(
    "allowNonBinaryDigits",
  );
  const useCustomCharsCheckbox = document.getElementById("useCustomChars");

  obj.useNonBinaryDigits = useNonBinaryDigitsCheckbox.checked;
  obj.useCustomChars = useCustomCharsCheckbox.checked;
  console.log(obj);
  // Now change length, timeToMemorize, and timeout to be numbers
  try {
    obj.length = parseInt(obj.length);
    obj.timeToMemorize = parseInt(obj.timeToMemorize);
    obj.timeout = parseInt(obj.timeout);
  } catch (err) {
    console.error("There was an error when parsing the ints", err);
    return;
  }

  window.electron.updateConfig(obj);
}

function showModal() {
  modal.style.display = "flex";
}

function closeModal() {
  clearModal();
  modal.style.display = "none";
}

function clearModal() {
  // remove the children of modalContent, except for the x symbol
  Array.from(modalContent.children).forEach((child) => {
    if (child.id === closeSpan.id) {
      return;
    }
    modalContent.removeChild(child); // remove every child except for the close button
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function h(strings, ...values) {
  let str = "";
  let count = 0;
  for (let i = 0; i < strings.length; ++i) {
    if (count >= values.length) str += strings[i];
    else if (count >= 0) str += strings[i] + escapeHTML(values[count++]);
  }
  return str;
}
