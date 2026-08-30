const width = Number(process.argv[2]);
const height = Number(process.argv[3]);
const mineCount = Number(process.argv[4]);

if (!width || !height || !mineCount) {
  console.error("Usage: <width> <height> <mineCount>");
  console.log("Example: 8 8 7");
  process.exit(1);
}

const regex: string[] = [];
const replacer: string[] = [];
const output: string[] = [];

type Point = [number, number];
type Group = { re: string; group: string };

let id = 0;

const getGroupId = () => `g${++id}`;

function group(re: string): Group {
  const n = getGroupId();
  return {
    re: `(?<${n}>${re})`,
    group: `$<${n}>`,
  };
}

function array2d<T>(w: number, h: number, fill: T): T[][] {
  return Array.from({ length: w }, () => new Array(h).fill(fill));
}

function iter2d(fn: (x: number, y: number) => void, rowFn?: (x: number) => void) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      fn(x, y);
    }

    if (rowFn) rowFn(x);
  }
}

function iterNeighbors(x: number, y: number, fn: (dx: number, dy: number) => void) {
  for (let dx = x - 1; dx <= x + 1; dx++)
  for (let dy = y - 1; dy <= y + 1; dy++) {
    if (dx >= 0 && dy >= 0 && dx < width && dy < height) {
      fn(dx, dy);
    }
  }
}

function addNewGroup(re: string) {
  const g = group(re);
  addGroup(g);
  return g;
}

function addGroup(...re: (string | Group)[]) {
  for (const r of re) {
    regex.push(typeof r == "string" ? r : r.re);
  }
}

function addReplacer(...re: (string | Group)[]) {
  for (const r of re) {
    replacer.push(typeof r == "string" ? r : r.group);
  }
}

function addKeptGroup(re: string) {
  addReplacer(addNewGroup(re));
}

function matchLetter(letter: string) {
  regex.push(`[^${letter}]*`);
  return addNewGroup(letter);
}

function matchLetters(text: string) {
  return [...text].map(matchLetter);
}

function matchDigits(largestDigit: number) {
  const digits: Group[] = [];
  for (let i = 0; i <= largestDigit; i++) {
    digits[i] = addNewGroup(`${i}`);
  }

  return digits;
}

function matchNChars(char: string, n: number) {
  if (n == 0) return "";
  if (n < 5) return char.repeat(n);
  return `${char}{${n}}`;
}

const mines = array2d(width, height, 0);
const board = array2d(width, height, 0);

const mineList: Point[] = [];

for (let i = mineCount; i; ) {
  const x = Math.floor(Math.random() * width);
  const y = Math.floor(Math.random() * height);
  if (mines[x][y]) continue;

  mines[x][y] = 1;
  mineList.push([x, y]);

  iterNeighbors(x, y, (dx, dy) => board[dx][dy]++);
  i--;
}

const countGroups = new Map<number, Point[]>();

iter2d((x, y) => {
  if (mines[x][y]) return;
  
  const value = board[x][y];
  const group = countGroups.get(value) || countGroups.set(value, []).get(value)!;
  group.push([x, y]);
});

const visited = new Set<number>();
const zeroAreas: { zeroes: Point[], points: Point[] }[] = [];

iter2d((x, y) => {
  const idx = x * width + y;

  if (board[x][y] != 0 || visited.has(idx)) return;
  visited.add(idx);

  const zeroes: Point[] = [];
  const points: Point[] = [];
  const queue: Point[] = [[x, y]];
  
  const addedPoints = new Set<number>();

  while (queue.length) {
    const [cx, cy] = queue.shift()!;
    zeroes.push([cx, cy]);

    iterNeighbors(cx, cy, (dx, dy) => {
      const idx = dx * width + dy;
      if (board[dx][dy] == 0) {
        if (!visited.has(idx)) {
          visited.add(idx);
          queue.push([dx, dy]);
        }
      }

      if (!addedPoints.has(idx)) {
        points.push([dx, dy]);
        addedPoints.add(idx);
      }
    });
  }

  zeroAreas.push({ zeroes, points });
});

function point2idx(x: number, y: number) {
  return x * (width + 1) + y;
}

function matchPoint(x: number, y: number) {
  const idx = point2idx(x, y);
  if (idx > width) return `[\\s\\S]{${idx}}`;
  if (idx > 0) return `.{${idx}}`;
  return "";
}

function matchLookaheadPoints(points: Point[]) {
  regex.push(`(?=(?:${points.map(([x, y]) => matchPoint(x, y)).join("|")})x)`);
}

function safeCellOpening() {
  regex.push("^");
  addKeptGroup("[^v]+v\\n\\n");
  regex.push("(?:");
  
  for (const [count, coords] of countGroups) {
    if (count == 0) continue;

    addKeptGroup(coords.map(([x, y]) => matchPoint(x, y)).join("|"));
    addGroup("x");
  
    const copy = addNewGroup(`[^:]+[^${count}]+`);
    const digit = addNewGroup(`${count}`);
  
    addReplacer(digit, copy, digit);
    regex.push("|");
  }
  
  regex.pop();
  regex.push(")");
  addKeptGroup("[\\s\\S]*$");
}

function lossDetection() {
  regex.push("^(?:");
  const Y = matchLetter("y");
  regex.push("[^v]+v\\n");
  const NEWLINE = addNewGroup("\\n");

  matchLookaheadPoints(mineList);
  
  const [O, L, T, U, S] = matchLetters("oltus");
  const SPACE = addNewGroup(" ");

  regex.push("[^:]+: ");

  let largestDigit = 0;
  for (const digit of board.flat()) {
    largestDigit = Math.max(digit, largestDigit);
  }

  const DIGIT = matchDigits(largestDigit);

  regex.push("[^*]*");
  const BOMB = addNewGroup("\\*");
  const EXCLAMATION = addNewGroup("!");
  regex.push(")[\\s\\S]*$");
  
  addReplacer(Y, O, U, SPACE, L, O, S, T, EXCLAMATION, NEWLINE, NEWLINE);

  iter2d(
    (x, y) => addReplacer(mines[x][y] ? BOMB : DIGIT[board[x][y]]),
    () => addReplacer(NEWLINE)
  );
}

function openZeroes() {
  regex.push("^");
  addKeptGroup("[^v]+v\\n\\n");
  regex.push("(?:");

  for (const area of zeroAreas) {
    matchLookaheadPoints(area.zeroes);

    const branch: any[] = [];
    let lastIdx = -1;
    let largestDigit = 0;

    area.points.sort((a, b) => point2idx(...a) - point2idx(...b));

    let count = 0;

    for (const [x, y] of area.points) {
      const idx = point2idx(x, y);
      const gap = idx - (lastIdx + 1);

      if (gap > 0) {
        regex.push(matchNChars(".", count));
        count = 0;

        branch.push({ skip: addNewGroup(`[^:]{${gap}}`) });
      }

      count++;
      branch.push({ x, y });
      largestDigit = Math.max(largestDigit, board[x][y]);

      if (mines[x][y]) throw `something went wrong`;

      lastIdx = idx;
    }

    regex.push(matchNChars(".", count));

    const rest = addNewGroup("[^:]+: ");

    const digitGroup = getGroupId();
    regex.push(`(?<${digitGroup}>`);
    const digits = matchDigits(largestDigit);
    regex.push(")");

    for (const { skip, x, y } of branch) {
      if (skip) addReplacer(skip);
      else addReplacer(digits[board[x][y]]);
    }

    addReplacer(rest);
    replacer.push(`$<${digitGroup}>`);

    regex.push("|");
  }

  regex.pop();
  regex.push(")");
  addKeptGroup("[\\s\\S]*$");
}

function winDetection() {
  regex.push("^");
  const B = matchLetter("b");
  const Y = addNewGroup("y");
  const SPACE = addNewGroup(" ");
  const YUI_DEV = addNewGroup("yui.dev");
  regex.push("\\n\\n(?:");
  let lastChar = "", count = 0;

  const push = () => {
    if (lastChar && count) {
      regex.push(lastChar);
      if (count > 1) regex.push(`{${count}}`);
      count = 0;
      lastChar = "";
    }
  };

  iter2d((x, y) => {
    if (mines[x][y]) {
      push();
      regex.push("[_fF]");
    } else {
      const ch = `${board[x][y]}`;
      if (lastChar != ch) push();
      lastChar = ch;
      count++;
    }
  }, () => {
    push();
    regex.push("\\n");
  });
  push();

  const O = matchLetter("o");
  regex.push("...");
  const E = addNewGroup("e");
  const N = addNewGroup("n");
  regex.push(".");
  const A = addNewGroup("a");
  regex.push(".");
  const C = addNewGroup("c");

  const R = matchLetter("r");
  const T = matchLetter("t");
  regex.push(".");
  const W = addNewGroup("w");
  const U = matchLetter("u");
  const D = matchLetter("d");

  const COLON = matchLetter(":");
  const THREE = matchLetter("3");
  const EXCLAMATION = matchLetter("!");

  addReplacer(Y, O, U, SPACE, W, O, N, EXCLAMATION, SPACE, C, R, E, A, T, E, D, SPACE, B, Y, SPACE, YUI_DEV, SPACE, COLON, THREE);
  regex.push(")");
}

safeCellOpening();
regex.push("|");
lossDetection();
regex.push("|");
winDetection();
regex.push("|");
openZeroes();

output.push("RegexSweeper by yui.dev");
output.push("");

for (let y = 0; y < height; y++) {
  output.push("_".repeat(width));
}

output.push(
  "",
  "To open a cell, replace it with 'x' and run the regex.",
  `Revealed cells will be displayed like this: 012345678`,
  "",
  `There are ${mineCount}*!`,
);

console.log(id, "groups");

let outRegex = regex.join("");
let outReplacer = replacer.join("");

if (id < 100) {
  outRegex = outRegex.replace(/\?<g\d+>/g, "");
  outReplacer = outReplacer.replace(/[g<>]/g, "");
} else {
  console.log("100+ groups used. This will use named groups which are not supported in some places");
}

console.log("\x1b[0;1m\nRegex:\x1b[0m");
console.log("\x1b[0;33m"+outRegex+"\x1b[0m");
console.log("\x1b[0;1m\nReplacer:\x1b[0m");
console.log("\x1b[0;33m"+outReplacer+"\x1b[0m");
console.log("\x1b[0;1m\nText:\x1b[0m");
console.log("\x1b[0;32m"+output.join("\n")+"\x1b[0m");
console.log();
console.log("\x1b[0;2m-----------\x1b[0m");
if (process.argv.includes("--show-board"))
console.log(board.map((a,x) => a.map((b,y)=>mines[x][y]?"_":b).join("")).join("\n"));
