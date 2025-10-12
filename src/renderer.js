// Buttons
const newRoundButton = document.getElementById("newRoundButton");
const howToPlayButton = document.getElementById("howToPlay");
const submitButton = document.getElementById("submitButton");

const inputField = document.getElementById("byteInput");
const byteDisplay = document.getElementById("byteDisplay");
const scoreField = document.getElementById("score");
const highScoreField = document.getElementById("highScore");
const countdownField = document.getElementById("timeRemaining");

newRoundButton.addEventListener("click", newRound);
howToPlayButton.addEventListener("click", showModal);
submitButton.addEventListener("click", submit);

// Modal
const modal = document.getElementById("modal");
const closeSpan = document.getElementById("closeModal");

closeSpan.addEventListener("click", closeModal);

// When the user clicks anywhere outside the modal, close it
window.addEventListener("click", (event) => {
  if (event.target != howToPlayButton) closeModal();
});
window.addEventListener("keydown", (event) => {
  if (event.code == "Escape") {
    closeModal();
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
};

function generateString() {
  let str = "";
  for (let i = 0; i < CONFIG.length; ++i) {
    let bit = Math.floor(Math.random() * 2); // [0, 1] or [0, 2) in interval notation
    str += bit.toString();
  }
  return str;
}

async function refreshConfig() {
  const configPath = await window.electron.getConfig();
  const response = await fetch(configPath);
  const body = await response.json();
  CONFIG = body;
  Object.freeze(CONFIG);
  CONFIG_FILE_PATH = configPath;

  // Set the countdown text
  countdownField.innerHTML = `<span>Time remaining<br />--</span>`;

  // Set the high score if there is one
  if (CONFIG.highScore != undefined) {
    highScore = CONFIG.highScore;
    highScoreField.innerHTML = h`<span>High score<br />${highScore}</span>`;
  } else {
    highScoreField.innerHTML = `<span>High score<br />0</span>`;
  }

  document.getElementById("configFileLocation").textContent = CONFIG_FILE_PATH;
}

function newRound() {
  newRoundButton.setAttribute("disabled", true); // disable the new round button so there aren't multiple rounds at the same time
  inputField.setAttribute("disabled", true);
  answer = generateString();

  byteDisplay.value = answer;

  setTimeout(() => {
    inputField.removeAttribute("disabled");
    submitButton.removeAttribute("disabled");
    byteDisplay.value = "";
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
  }, CONFIG.timeToMemorize);
}

function submit() {
  if (timerID !== undefined) {
    // Only submit if there is a round going on
    const submittedValue = inputField.value.trim();
    if (submittedValue === answer) {
      endGame(true);
    } else {
      endGame(false);
    }
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

function showModal() {
  modal.style.display = "block";
}
function closeModal() {
  modal.style.display = "none";
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
