const DATA_CODEWORDS = {
  1: 19,
  2: 34,
  3: 55,
  4: 80,
  5: 108,
};

const EC_CODEWORDS = {
  1: 7,
  2: 10,
  3: 15,
  4: 20,
  5: 26,
};

const ALIGNMENT_POSITIONS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
};

const EXP = new Array(512);
const LOG = new Array(256);

let value = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = value;
  LOG[value] = i;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

function gfMul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function reedSolomon(data, degree) {
  const gen = generatorPoly(degree);
  const out = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ out.shift();
    out.push(0);
    for (let i = 0; i < degree; i++) out[i] ^= gfMul(gen[i], factor);
  }
  return out;
}

function pushBits(bits, val, count) {
  for (let i = count - 1; i >= 0; i--) bits.push((val >>> i) & 1);
}

function makeCodewords(text, version) {
  const bytes = [...Buffer.from(text, 'utf8')];
  const capacity = DATA_CODEWORDS[version];
  const bits = [];

  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  for (const byte of bytes) pushBits(bits, byte, 8);

  const capacityBits = capacity * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  pushBits(bits, 0, terminator);
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  for (let pad = 0; data.length < capacity; pad ^= 1) {
    data.push(pad ? 0x11 : 0xec);
  }

  return data.concat(reedSolomon(data, EC_CODEWORDS[version]));
}

function createMatrix(size) {
  return {
    modules: Array.from({ length: size }, () => new Array(size).fill(false)),
    reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function setModule(matrix, row, col, dark, reserve = true) {
  if (row < 0 || col < 0 || row >= matrix.modules.length || col >= matrix.modules.length) return;
  matrix.modules[row][col] = dark;
  if (reserve) matrix.reserved[row][col] = true;
}

function drawFinder(matrix, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      const inFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const dark = inFinder && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      setModule(matrix, rr, cc, dark);
    }
  }
}

function drawAlignment(matrix, centerRow, centerCol) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      setModule(matrix, centerRow + r, centerCol + c, dark);
    }
  }
}

function drawFunctionPatterns(matrix, version) {
  const size = matrix.modules.length;
  drawFinder(matrix, 0, 0);
  drawFinder(matrix, 0, size - 7);
  drawFinder(matrix, size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    setModule(matrix, 6, i, i % 2 === 0);
    setModule(matrix, i, 6, i % 2 === 0);
  }

  const positions = ALIGNMENT_POSITIONS[version];
  for (const row of positions) {
    for (const col of positions) {
      if ((row < 9 && col < 9) || (row < 9 && col > size - 10) || (row > size - 10 && col < 9)) continue;
      drawAlignment(matrix, row, col);
    }
  }

  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      matrix.reserved[8][i] = true;
      matrix.reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    matrix.reserved[8][size - 1 - i] = true;
    matrix.reserved[size - 1 - i][8] = true;
  }
  setModule(matrix, 4 * version + 9, 8, true);
}

function maskBit(mask, row, col) {
  if (mask === 0) return (row + col) % 2 === 0;
  if (mask === 1) return row % 2 === 0;
  if (mask === 2) return col % 3 === 0;
  return (row + col) % 3 === 0;
}

function placeData(matrix, codewords, mask) {
  const size = matrix.modules.length;
  const bits = [];
  for (const byte of codewords) pushBits(bits, byte, 8);

  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let offset = 0; offset < 2; offset++) {
        const c = col - offset;
        if (matrix.reserved[row][c]) continue;
        const bit = bitIndex < bits.length ? bits[bitIndex++] === 1 : false;
        matrix.modules[row][c] = bit ^ maskBit(mask, row, c);
      }
    }
    upward = !upward;
  }
}

function formatBits(mask) {
  const data = (0b01 << 3) | mask;
  let bits = data << 10;
  const generator = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((bits >>> i) & 1) bits ^= generator << (i - 10);
  }
  return (((data << 10) | bits) ^ 0x5412) & 0x7fff;
}

function drawFormat(matrix, mask) {
  const size = matrix.modules.length;
  const bits = formatBits(mask);
  const first = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const second = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];

  for (let i = 0; i < 15; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    setModule(matrix, first[i][0], first[i][1], dark);
    setModule(matrix, second[i][0], second[i][1], dark);
  }
}

function chooseVersion(text) {
  const length = Buffer.byteLength(text, 'utf8');
  for (const [version, capacity] of Object.entries(DATA_CODEWORDS)) {
    if (length <= capacity - 2) return Number(version);
  }
  throw new Error('二维码内容过长');
}

function matrixToSvgDataUrl(modules, scale = 4, margin = 4) {
  const size = modules.length;
  const viewSize = size + margin * 2;
  const rects = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row][col]) rects.push(`<rect x="${col + margin}" y="${row + margin}" width="1" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewSize * scale}" height="${viewSize * scale}" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${viewSize}v${viewSize}H0z"/><g fill="#111">${rects.join('')}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function createQrDataUrl(text) {
  const version = chooseVersion(text);
  const mask = 0;
  const size = 21 + (version - 1) * 4;
  const matrix = createMatrix(size);
  drawFunctionPatterns(matrix, version);
  placeData(matrix, makeCodewords(text, version), mask);
  drawFormat(matrix, mask);
  return matrixToSvgDataUrl(matrix.modules);
}

module.exports = { createQrDataUrl };
