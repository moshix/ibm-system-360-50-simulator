let set = 0;
var canvasWidth = 0, canvasHeight = 0;
var imgWidth = 0, imgHeight = 0;
// Resize isn't really working
function resize() {
  canvasHeight = window.innerHeight - $("#nav").height();
  $("#sidebar").height(window.innerHeight - $("#nav").height());
  canvasWidth = window.innerWidth - $("#sidebar").width();
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
  console.log(canvasHeight, canvasWidth, canvas.style.width, canvas.style.height);
  draw();
}

function foo() {
  console.log('foo');
  return 1;
}

let imatrix = null; // Inverted transformation matrix.

/**
 * Draws the display.
 */
function consoleDraw() {
  // Clear
  console.log('drawInt');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  // window is centered on 0, 0. Translate to center image.
  ctx.translate(-imgWidth / 2, -imgHeight / 2);
  var matrix = ctx.getTransform();
  imatrix = matrix.invertSelf(); // Remember inverted transformation matrix.
  ctx.drawImage(img, 0, 0);

  // Draw rollers in their current positions. Each roller is drawn in two parts
  for (let r = 0; r < 4; r++) {
    ctx.drawImage(rollerImgs[2 * r][rollerPos[r] - 1], 393, interp(723, 1008, 4, r), 454, 24);
    ctx.drawImage(rollerImgs[2 * r + 1][rollerPos[r] - 1], 868, interp(723, 1008, 4, r), 454, 24);
  }

  consoleDrawLights();
}

/**
 *  Draws the various console lights.
 */
function consoleDrawLights() {
  let bits = new Array(36).fill(0);
  switch (rollerPos[0]) {
    case 1:
      // TODO: Common channel roller
      break;
    case 2:
      // TODO: Common channel roller
      break;
    case 3:
      // TODO: Common channel roller
      break;
    case 4:
      // TODO: Common channel roller
      break;
    case 5:
      // TODO: Common channel roller
      break;
    case 6:
      // TODO: Common channel roller
      break;
    case 7:
      // Unused
      break;
    case 8:
      // Unused
      break;
  }
  drawRollerLights(0, bits);

  bits.fill(0);
  switch (rollerPos[1]) {
    case 1:
      extractBits(state['B'], 32, bits, 0, true /* parity */); // B register
      break;
    case 2:
      extractBits(state['C'], 32, bits, 0, true /* parity */); // C register
      break;
    case 3:
      // TODO: Channel
      break;
    case 4:
      // TODO: Channel
      break;
    case 5:
      // TODO: Channel
      break;
    case 6:
      // TODO: Channel
      break;
    case 7:
      // TODO: Channel
      break;
    case 8:
      // Unused
      break;
  }
  drawRollerLights(1, bits);

  bits.fill(0);
  switch (rollerPos[2]) {
    case 1:
      extractBits(state['L'], 32, bits, 0, true /* parity */); // L register
      break;
    case 2:
      extractBits(state['R'], 32, bits, 0, true /* parity */); // R register
      break;
    case 3:
      extractBits(state['M'], 32, bits, 0, true /* parity */); // M register
      break;
    case 4:
      extractBits(state['H'], 32, bits, 0, true /* parity */); // H register
      break;
    case 5:
      extractBits(state['SAR'], 24, bits, 0, true /* parity */); // SAR register (24 bits)
      break;
    case 6:
      // TODO: Channel
      break;
    case 7:
      // TODO: Channel
      break;
    case 8:
      // Unused
      break;
  }
  drawRollerLights(1, bits);
}

/**
 * Extracts bits from value, putting them into the array bits.
 * This is the key function to convert a value into the bits displayed on the lights.
 * nBits = number of bits to extract
 * offset = offset into bits for leftmost bit
 * useParity = true to store parity for each byte. E.g. nBits=32 -> 36 bits stored.
 * Note that System/360 numbers bits with 1 on the left and 32 on the right,
 * but that's not the case here.
 */
function extractBits(value, nBits, bits, offset, useParity) {

  // Extract bit i (i==0 for leftmost bit)
  function bitValue(i) {
    return (value & (1 << (nBits - i - 1))) ? 1 : 0;
  }
  // Compute odd parity of 8 bits starting at the given index
  function byteParity(start) {
    let parity = 1; // Odd parity
    for (let j = start; j < start + 8; j++) { // Loop over byte to compute parity
      parity ^= bitValue(j);
    }
    return parity
  }
  for (let i = 0; i < nBits; i++) {
    if (useParity && (i % 8) == 0) { // Insert parity bit
      bits[offset++] = byteParity(i);
    }
    bits[offset++] = bitValue(i);
  }
}

/**
 * Draws the lights for the appropriate roller.
 */
function drawRollerLights(row: number, bits: number[]) {
  for (let pos = 0; pos < 36; pos++) {
    const col = pos < 18 ? pos : pos + 1; // Account for the gap between the two groups
    let x = interp(427, 1282, 37, col);
    let y = interp(782, 1069, 4, row);
    ctx.beginPath();
    if (bits[pos]) {
      ctx.fillStyle = "#ee5555"; // on
    } else {
      ctx.fillStyle = "#444444"; // off
    }
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
  }
}


/**
 * Returns the unscaled [x, y] coordinates for the event.
 * Uses global imatrix, the inverted transformation matrix.
 */
function coords(e) {
  const rect = $("#canvas")[0].getBoundingClientRect();
  const xscaled = e.clientX - rect.left;
  const yscaled = e.clientY - rect.top;
  const x = xscaled * imatrix.a + yscaled * imatrix.c + imatrix.e;
  const y = xscaled * imatrix.b + yscaled * imatrix.d + imatrix.f;
  return [Math.round(x), Math.round(y)];
}

const regions: [number, number, number, number, string][] = [
  [214, 525, 228, 556, "switch-dcoff"],
  [334, 541, 374, 581, "dial-voltage"],
  [511, 282, 538, 310, "dial-6tc"],
  [631, 284, 660, 317, "dial-12ros2"],
  [764, 286, 795, 310, "dial-56xy1"],
  [507, 375, 533, 401, "dial-6var"],
  [642, 397, 669, 437, "dial-margin"],
  [764, 372, 788, 404, "dial-60z1"],
  [509, 477, 536, 499, "dial-6m2"],
  [766, 472, 793, 499, "dial-56xy2"],
  [509, 570, 538, 601, "dial-6ma"],
  [633, 576, 664, 603, "dial-12ros1"],
  [768, 572, 797, 599, "dial-60z2"],

  [899, 277, 955, 324, "dial-storagetest"],
  [1012, 288, 1032, 328, "sw-storagetest-write"],
  [1061, 284, 1083, 335, "sw-storagetest-stop-on-check"],
  [1105, 284, 1130, 333, "sw-storagetest-invert"],
  [1154, 282, 1176, 333, "sw-storagetest-isolate"],

  [1287, 235, 1360, 295, "epo"],

  [902, 468, 939, 503, "dial-56xy3"],
  [1125, 470, 1170, 503, "dial-56xy4"],
  [895, 565, 935, 599, "dial-60z3"],
  [1010, 499, 1048, 539, "dial-storage-margin"],
  [1125, 574, 1172, 607, "dial-60z4"],

  [154, 740, 205, 774, "button-channel-enter"],
  [261, 734, 276, 778, "sw-channel-op"],
  [194, 836, 234, 869, "dial-channel-display"],


  [403, 730, 1467, 760, "roller-1"],
  [403, 822, 1467, 860, "roller-2"],
  [403, 913, 1467, 950, "roller-3"],
  [403, 1009, 1467, 1046, "roller-4"],

  [476, 1403, 520, 1450, "dial-storage-select"],

  [407, 1267, 411, 1318, "toggle"],

  [669, 1578, 713, 1622, "dial-flt-control"],
  [856, 1578, 901, 1618, "dial-check-control"],
  [669, 1707, 709, 1743, "dial-rate"],
  [667, 1808, 713, 1846, "button-start"],
  [794, 1678, 842, 1713, "button-system-reset"],
  [856, 1678, 901, 1713, "button-psw-restart"],
  [915, 1678, 963, 1713, "button-check-reset"],
  [794, 1741, 842, 1775, "button-set-io"],
  [856, 1741, 901, 1775, "button-store"],
  [915, 1741, 963, 1775, "button-display"],
  [794, 1808, 842, 1844, "button-stop"],
  // [856,1808,901,1844,"button-white"],
  [915, 1808, 963, 1844, "button-log-out"],

  [1099, 1583, 1156, 1630, "button-power-on"],
  [1303, 1585, 1363, 1623, "button-power-off"],
  [1110, 1692, 1156, 1734, "dial-load-1"],
  [1212, 1692, 1258, 1734, "dial-load-2"],
  [1307, 1694, 1356, 1734, "dial-load-3"],
  [1108, 1809, 1163, 1842, "button-interrupt"],
  [1312, 1811, 1369, 1847, "button-load"],
];

const lights: { [name: string]: [number, number] } = {};

let rollerImgs = [];
/**
 * Loads all the roller images: 8 positions for 8 half-rollers.
 * The images are stored in rollerImgs.
 */
function initRollers() {
  for (let roller = 1; roller <= 8; roller++) {
    let imgs = [];
    for (let pos = 1; pos <= 8; pos++) {
      let img = new Image;
      img.src = "imgs/roller-" + roller + "-" + pos + ".jpg";
      imgs.push(img);
    }
    rollerImgs.push(imgs);
  }
}

// Linearly interpolates between x0 and x1. Assume n points in total and we select point i.
// That is, for i=0, output x0; for i=N, output x1.
function interp(x0: number, x1: number, n: number, i: number) {
  return (x1 - x0) / (n - 1) * i + x0;
}

/**
 * Configures the lights and switch positions.
 */
function consoleInit() {
  img = new Image;
  img.addEventListener("load", function () {
    imgWidth = img.width;
    imgHeight = img.height;
    draw();
  });
  img.src = "imgs/console.jpg";
  initRollers();
  ctx.fillStyle = "green";

  // Roller lights
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= 36; col++) {
      if (col == 18) continue;
      let x = (1282 - 427) / 36 * col + 427;
      let y = (1069 - 782) / 3 * row + 782;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      lights["roller-" + row + "-" + col] = [x, y];
    }
  }

  // Lights below
  ctx.fillStyle = "yellow";
  for (let i = 0; i < 2; i++) {
    for (let col = 0; col <= 39; col++) {
      if (col == 18) continue;
      if (col == 37 || col == 38 || (col == 39 && i == 1)) continue;
      let x = (1282 - 427) / 36 * col + 427;
      let y = [1181, 1230][i];
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      const name = ["lights", "sdr"][i];
      lights[name + col] = [x, y];
    }
  }

  // Linearly interpolates between x0 and x1. Assume n points in total and we select point i.
  // That is, for i=0, output x0; for i=N, output x1.
  function interp(x0, x1, n, i) {
    return (x1 - x0) / (n - 1) * i + x0;
  }

  // SDR switches
  ctx.fillStyle = "red";
  for (let col = -1; col <= 36; col++) {
    if (col == 9 || col == 18 || col == 19 || col == 28 || col == 37) continue;
    let x = interp(427, 1282, 37, col);
    let y = 1293;
    regions.push([x - 5, y - 25, x + 5, y + 25, "switch-sdr-" + col]);
  }

  // Instruction address register lights
  ctx.fillStyle = "red";
  for (let col = 9; col <= 36; col++) {
    if (col == 18) continue;
    if (col == 37 || col == 38 || col == 39) continue;
    let x = interp(427, 1282, 37, col);
    let y = 1359
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    lights["iar-" + col] = [x, y];
  }

  // IAR switches
  for (let col = 10; col <= 36; col++) {
    if (col == 18 || col == 19 || col == 28 || col == 37) continue;
    let x = interp(427, 1282, 37, col);
    let y = 1424;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    regions.push([x - 5, y - 25, x + 5, y + 25, "switch-iar-" + col]);
  }

  // IPL lights
  for (let col = 0; col <= 4; col++) {
    let x = interp(1197, 1294, 5, col);
    let y = 1819;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    lights["ipl-" + col] = [x, y];
  }

  // Misc toggles
  for (let col = 0; col < 10; col++) {
    let x = interp(135, 567, 10, col);
    let y = 1598;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * Tests if the event e is inside a region.
 * Returns the region or undefined.
 */
function testLocation(e): (string | undefined) {
  // Need to translate mouse position from scaled coordinates to original coordinates
  const [x, y] = coords(e);
  for (let i = 0; i < regions.length; i++) {
    if (x > regions[i][0] && y > regions[i][1] && x < regions[i][2] && y < regions[i][3]) {
      return <string>regions[i][4];
    }
  }
  return undefined;
}

/**
 * Updates pointer when over a clickable region.
 */
$("#canvas").on("mousemove", function (e) {
  const result = testLocation(e);
  if (result) {
    $("#label").html(result);
    $('#canvas').css('cursor', 'pointer');
  } else {
    $("#label").html("");
    $('#canvas').css('cursor', 'default');
  }
});

// Called on click without drag
// Need to distinguish dragging the image from clicking on it.
function clicked(e) {
  const result = testLocation(e);
  if (result) {
    const parts = result.split("-");
    if (parts[0] == "roller") {
      updateRoller(parseInt(parts[1], 10));
    }
  }
}

let rollerPos = [1, 1, 1, 1]; // Positions of the four rollers

function updateRoller(n: number) {
  rollerPos[n - 1] = (rollerPos[n - 1] % 8) + 1; // increment value 1-8, wrapping 8 to 1.
  draw();
}


let img = undefined; // The image of the console
