/**
 * "BM" in variable names just short-hand for
 *     BitMap (but they're just arrays here really)
 */
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const pixelCount = canvasWidth * canvasHeight;
const sandFill = 0.62;
let autoRotate = true;
const pipCount = pixelCount * sandFill;
// Sand preference memory
let colorPrefChoice;
let sandSettings;
let startTypes = ["messy", "dune", "organised"];
let startType = startTypes[0];

// Available sand presets
const colorPrefs = {
  magicSand: {
    lightness: 50, // %
    saturation: 50, // %
    hueRotate: 180, // degrees
    hueRange: 100, // degrees
    hueReverse: false,
  },
  hotSand: {
    lightness: 60, // %
    saturation: 60, // %
    hueRotate: 10, // degrees
    hueRange: 40, // degrees
    hueReverse: true,
  },
  beachSand: {
    lightness: 80, // %
    saturation: 30, // %
    hueRotate: 40, // degrees
    hueRange: 15, // degrees
    hueReverse: true,
  },
  rainbowSand: {
    lightness: 60, // %
    saturation: 70, // %
    hueRotate: 0, // degrees
    hueRange: 350, // degrees
    hueReverse: false,
  },
};
nextSandColorPref();

let pleaseRotate;
// let gravity = [0, 1];
let pipList = [];
const simulationSpeed = Math.ceil(canvasWidth / 64);
const iterationsBeforeSettled = Math.max(canvasWidth, 32);

class Grain {
  x;
  y;
  color;
  iterationsHasBeenSettled = 0;
  constructor(x = 0, y = 0, color = "rgb(200, 0, 0)") {
    this.setCoordinates([x, y]);
    this.color = color;
  }
  setCoordinates([x, y]) {
    this.x = x;
    this.y = y;
  }
  getCoordinates() {
    return [this.x, this.y];
  }
  isSettled() {
    return this.iterationsHasBeenSettled > iterationsBeforeSettled;
  }
  incrementSettledCounter() {
    this.iterationsHasBeenSettled++;
  }
  resetSettledCounter() {
    this.iterationsHasBeenSettled = 0;
  }
  fall() {
    if (this.isSettled()) {
      return false;
    }
    let didFall = false;
    let targetCoordinates;
    let currentCoordinates = this.getCoordinates();
    // Try fall straight down, otherwise try diaginal down.
    targetCoordinates = SandField.down1(currentCoordinates);
    didFall = this.attemptFall(targetCoordinates);
    if (!didFall) {
      if (toggler()) {
        targetCoordinates = SandField.downLeft1(currentCoordinates);
        didFall = this.attemptFall(targetCoordinates);
      } else {
        targetCoordinates = SandField.downRight1(currentCoordinates);
        didFall = this.attemptFall(targetCoordinates);
      }
      if (!didFall) {
        if (toggler()) {
          targetCoordinates = SandField.downLeft2(currentCoordinates);
          didFall = this.attemptFall(targetCoordinates);
        } else {
          targetCoordinates = SandField.downRight2(currentCoordinates);
          didFall = this.attemptFall(targetCoordinates);
        }
      }
      if (!didFall) {
        this.incrementSettledCounter();
      }
    }
  }
  attemptFall(targetCoordinates) {
    if (targetCoordinates && SandField.getPoint(targetCoordinates) === 0) {
      let currentCoordinates = this.getCoordinates();
      this.setCoordinates(targetCoordinates);
      SandField.setPoint(currentCoordinates, 0);
      SandField.setPoint(targetCoordinates, 1);
      return true;
    } else {
      return false;
    }
  }
}

class BitMap {
  #field = [];
  #width;
  #height;
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.field = new Array(width * height).fill(0);
  }
  validCoordinates([x, y]) {
    if (x < 0 || y < 0 || x > this.width || y > this.height) {
      return false;
    } else {
      return true;
    }
  }
  getBitMapState() {
    return this.field;
  }
  eraseBitMap() {
    for (let i = 0; i < this.field.length; i++) {
      this.field[i] = 0;
    }
  }
  coordinatesToFieldIndex([x, y]) {
    return x + y * this.width;
  }
  setPoint([x, y], value) {
    let fieldIndex = this.coordinatesToFieldIndex([x, y]);
    this.field[fieldIndex] = value;
  }
  getPoint([x, y]) {
    let fieldIndex = this.coordinatesToFieldIndex([x, y]);
    return this.field[fieldIndex];
  }
}

class GravityField extends BitMap {
  gravity = [0, 1];
  setGravity(vector = [0, 1]) {
    this.gravity = vector;
  }
  constructor(width = canvasWidth, height = canvasHeight) {
    super(width, height);
  }
  getFieldState() {
    return this.getBitMapState();
  }
  resetState() {
    this.setGravity();
    this.eraseBitMap();
  }
  rotateGravity(direction = "CW") {
    switch (direction) {
      case "CCW":
        this.gravity = rotateVector90CCW(this.gravity);
        break;
      default:
        this.gravity = rotateVector90CW(this.gravity);
        break;
    }
    updateCSSGravityCustomProperty(direction);
    consoleLogGravity(this.gravity);
  }
  down1(coordinates) {
    let [gx, gy] = this.gravity;
    let [fromX, fromY] = coordinates;
    let newCoordinates = [fromX + gx, fromY + gy];
    if (this.validCoordinates(newCoordinates)) {
      return newCoordinates;
    } else {
      return false;
    }
  }
  downLeft1(coordinates) {
    // "left" depends on gravity direction.
    let sidewaysVector = rotateVector90CW(this.gravity);
    return this.vectorMovement(coordinates, sidewaysVector);
  }
  downRight1(coordinates) {
    // "right" depends on gravity direction.
    let sidewaysVector = rotateVector90CCW(this.gravity);
    return this.vectorMovement(coordinates, sidewaysVector);
  }
  downLeft2(coordinates) {
    // "left" depends on gravity direction.
    let sidewaysVector = rotateVector90CW(this.gravity);
    sidewaysVector = combineVectors(sidewaysVector, sidewaysVector);
    return this.vectorMovement(coordinates, sidewaysVector);
  }
  downRight2(coordinates) {
    // "right" depends on gravity direction.
    let sidewaysVector = rotateVector90CCW(this.gravity);
    sidewaysVector = combineVectors(sidewaysVector, sidewaysVector);
    return this.vectorMovement(coordinates, sidewaysVector);
  }
  vectorMovement(coordinates, sidewaysVector = [0, 0]) {
    let [gx, gy] = combineVectors(this.gravity, sidewaysVector);
    let [fromX, fromY] = coordinates;
    let newCoordinates = [fromX + gx, fromY + gy];
    if (this.validCoordinates(newCoordinates)) {
      return newCoordinates;
    } else {
      return false;
    }
  }
}

let SandField = new GravityField(canvasWidth, canvasHeight);

addRandomPips();
startAnimation(); // Begin animation loop

let autoRotateInterval;
if (autoRotate === true) {
  autoRotateInterval = window.setInterval(() => {
    SandField.rotateGravity("CCW");
    console.log("🔄 auto-rotate");
    startAnimation();
  }, 4000);
}

function stopAutoRotation() {
  if (autoRotate === true) {
    clearInterval(autoRotateInterval);
    autoRotate = false;
    console.log("⏯ auto-rotate paused");
  }
}

function keyFlash(selector) {
  let uiKey = document.querySelector(selector);
  uiKey.classList.add("flash");
  window.setTimeout(() => {
    uiKey.classList.remove("flash");
  }, 200);
}

// Rotate sand bubble when pressing left or right keys
document.addEventListener(
  "keydown",
  function (event) {
    pipList.forEach((pip) => {
      pip.resetSettledCounter();
    });
    // console.log(event.keyCode);
    // Restart animation
    switch (event.keyCode) {
      case 38: {
        keyFlash(".key--up");
        nextSandColorPref();
        resetAndReinitialiseSand();
        resetAndReinitialiseSand();
        break;
      }
      case 37: {
        keyFlash(".key--left");
        stopAutoRotation();
        SandField.rotateGravity("CW");
        break;
      }
      case 40: {
        keyFlash(".key--down");
        resetAndReinitialiseSand();
        break;
      }
      case 39: {
        keyFlash(".key--right");
        stopAutoRotation();
        SandField.rotateGravity("CCW");
        break;
      }
    }
    startAnimation();
  },
  { passive: true }
);

function startAnimation() {
  console.log("▶️ sand");
  pipList.forEach((pip) => {
    pip.resetSettledCounter();
  });
  window.requestAnimationFrame(drawFrame);
}

document.querySelector("canvas").addEventListener(
  "click",
  function (event) {
    nextSandColorPref();
    resetAndReinitialiseSand();
  },
  { passive: true }
);

function nextSandColorPref() {
  // Choose next sand pref
  if (colorPrefChoice === undefined) {
    colorPrefChoice = 0;
  } else {
    colorPrefChoice++;
  }
  let keys = Object.keys(colorPrefs);
  let prefKey = keys[colorPrefChoice % keys.length];
  sandSettings = colorPrefs[prefKey];
  console.log(`🎨 ${prefKey}`);
}

function resetAndReinitialiseSand() {
  // Erase sand
  pipList = [];
  // Add new sand
  globalSetGravity();
  SandField.resetState();
  addRandomPips();
  startAnimation();
}

function globalSetGravity(degrees = 0, setCSSGravityFlag = true) {
  // Round degrees to quarter
  currentRotationDegrees = Math.round((degrees % 360) / 90) * 90;

  let gravityVector;
  if ((currentRotationDegrees + 0) % 360 === 0) {
    gravityVector = [0, 1];
  } else if ((currentRotationDegrees + 270) % 360 === 0) {
    gravityVector = rotateVector90CW([0, 1]);
  } else if ((currentRotationDegrees + 180) % 360 === 0) {
    gravityVector = rotateVector90CW(rotateVector90CW([0, 1]));
  } else if ((currentRotationDegrees + 90) % 360 === 0) {
    gravityVector = rotateVector90CW(
      rotateVector90CW(rotateVector90CW([0, 1]))
    );
  }

  SandField.setGravity(gravityVector);

  if (setCSSGravityFlag) {
    // Prevent visible spinning back to 0degrees (gravity down) when changing prefs.
    document.querySelector(".canvasContainer").style.transition = "none";
    document.documentElement.style.setProperty(
      "--gravity",
      `${currentRotationDegrees}deg`
    );
    window.setTimeout(() => {
      document.querySelector(".canvasContainer").style.transition = "inherit";
    }, 10);
  }
}

const rotateVector90CW = ([x, y]) => [-y, x];
const rotateVector90CCW = ([x, y]) =>
  rotateVector90CW(rotateVector90CW(rotateVector90CW([x, y])));

function addRandomPips() {
  for (let i = 0; i < pipCount; i++) {
    // Choose starting coordinates
    let x;
    let y;

    switch (startType) {
      case "messy":
        x = Math.floor(Math.random() * canvasWidth);
        y = Math.floor(Math.random() * canvasHeight);
        break;
      case "dune":
        x = i % canvasWidth;
        y = i % canvasWidth;
        break;
      case "organised":
        x = i % canvasWidth;
        y = Math.ceil(Math.ceil(i / canvasWidth) * (1 / sandFill));
        break;

      default:
        break;
    }
    // Choose sand grain color
    const maxY = canvasHeight;
    const color = `hsl(${
      sandSettings.hueRotate +
      ((sandSettings.hueReverse ? maxY - y : y) / maxY) * sandSettings.hueRange
    }, ${sandSettings.saturation}%, ${sandSettings.lightness}%)`;
    // Initialise sand grain
    const p = new Grain(x, y, color);
    // Add sand grain to list
    pipList.push(p);
  }
}

function drawPixel(x, y, color = "rgb(200, 0, 0)") {
  const width = 1;
  const height = 1;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawFrame() {
  // Upfront
  let simulationSteps = simulationSpeed;
  while (simulationSteps) {
    iterateGrains();
    simulationSteps--;
  }
  // Draw
  clearCanvas(); // Clear previous frame to draw new frame.
  drawGrains();

  const allSettled = pipList.every((pip) => {
    return pip.isSettled();
  });
  if (!allSettled) {
    window.requestAnimationFrame(drawFrame);
  } else {
    console.log("⏸ sand");
  }
}

function drawGrains() {
  pipList.forEach((grain) => {
    drawPixel(grain.x, grain.y, grain.color);
  });
}

function iterateGrains() {
  pipList.forEach((pip) => {
    pip.fall();
  });
}

let currentRotationDegrees = 0;
function updateCSSGravityCustomProperty(direction = "CW") {
  // FIXME gravity directions are bitmap coordinate centric but this isn't physics friendly
  if (direction === "CCW") {
    currentRotationDegrees += 90;
  } else {
    currentRotationDegrees -= 90;
  }
  document.documentElement.style.setProperty(
    "--gravity",
    `${currentRotationDegrees}deg`
  );
}

function consoleLogGravity(gravityVector) {
  let [x, y] = gravityVector;
  // FIXME gravity directions are bitmap coordinate centric but this isn't physics friendly
  if (y === 1) {
    console.log("Gravity ⬇️");
  } else if (x === -1) {
    console.log("Gravity ⬅️");
  } else if (y === -1) {
    console.log("Gravity ⬆️");
  } else if (x === 1) {
    console.log("Gravity ➡️");
  } else {
    console.warn("Gravity broken somehow");
  }
}

// Accelerometer code
var px = 50; // Position x and y
var py = 50;
var vx = 0.0; // Velocity x and y
var vy = 0.0;
var updateRate = 1 / 60; // Sensor refresh rate

function getAccel() {
  DeviceMotionEvent.requestPermission().then((response) => {
    if (response == "granted") {
      // Add a listener to get smartphone orientation
      // in the alpha-beta-gamma axes (units in degrees)
      let oldCartesianRotation = 0; // rounded to nearest 90°
      window.addEventListener("deviceorientation", (event) => {
        stopAutoRotation();

        // Expose each orientation angle in a more readable way
        let X = Math.floor(event.alpha);
        let Y = Math.floor(event.beta);
        let Z = Math.floor(event.gamma);
        let compass = Math.floor(event.webkitCompassHeading);
        let Roll = Math.floor((Math.atan2(Y, Z) * 180) / Math.PI);
        let Pitch = Math.floor(
          (Math.atan2(-X, Math.sqrt(Y * Y + Z * Z)) * 180) / Math.PI
        );

        let rotation_degrees = X;
        if (Y > 0 && Math.abs(Y) > Math.abs(Z)) {
          rotation_degrees = 0;
        } else if (Z < 0 && Math.abs(Z) > Math.abs(Y)) {
          rotation_degrees = 90;
        } else if (Y < 0 && Math.abs(Y) > Math.abs(Z)) {
          rotation_degrees = 180;
        } else if (Z > 0 && Math.abs(Z) > Math.abs(Y)) {
          rotation_degrees = 270;
        }

        let cartesianRotation =
          (Math.round((rotation_degrees % 360) / 90) * 90) % 360;
        if (oldCartesianRotation !== cartesianRotation) {
          globalSetGravity(cartesianRotation, false);
          oldCartesianRotation = cartesianRotation;
          startAnimation();
        }
        // Style button
        let readoutElement = document.querySelector(".gyroreadout");
        readoutElement.innerHTML = `
      X: ${X}
      Y: ${Y}
      Z: ${Z}
   Roll: ${Roll}
  Pitch: ${Pitch}
Compass: ${compass}
 RotDeg: ${rotation_degrees}
        `;
        readoutElement.style.transform = `rotate(${rotation_degrees}deg)`;
        let buttonElement = document.querySelector("button");
        buttonElement.classList.add("gyro-active");
        buttonElement.style.transform = `rotate(${rotation_degrees}deg)`;
      });
    }
  });
}

function combineVectors(a, b) {
  let newVector = [];
  for (let i = 0; i < a.length; i++) {
    newVector[i] = a[i] + b[i];
  }
  return newVector;
}

function coinFlip() {
  return Math.random() > 0.5;
}

let toggleBool = false;
function toggler() {
  toggleBool = !toggleBool;
  return toggleBool;
}
