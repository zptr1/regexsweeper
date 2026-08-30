export const regex: string[] = [];
export const replacer: string[] = [];
export const output: string[] = [];

export type Point = [number, number];
export type Group = { re: string; group: string };

export let groupId = 0;
export const getGroupId = () => `g${++groupId}`;

let width = 0;
let height = 0;

export function group(re: string): Group {
  const n = getGroupId();
  return {
    re: `(?<${n}>${re})`,
    group: `$<${n}>`,
  };
}

export function array2d<T>(w: number, h: number, fill: T): T[][] {
  return Array.from({ length: w }, () => new Array(h).fill(fill));
}

export function setBoardSize(w: number, h: number) {
  width = w;
  height = h;
}

export function iter2d(fn: (x: number, y: number) => void, rowFn?: (x: number) => void) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      fn(x, y);
    }

    if (rowFn) rowFn(x);
  }
}

export function iterNeighbors(x: number, y: number, fn: (dx: number, dy: number) => void) {
  for (let dx = x - 1; dx <= x + 1; dx++)
  for (let dy = y - 1; dy <= y + 1; dy++) {
    if (dx >= 0 && dy >= 0 && dx < width && dy < height) {
      fn(dx, dy);
    }
  }
}

export function addNewGroup(re: string) {
  const g = group(re);
  addGroup(g);
  return g;
}

export function addGroup(...re: (string | Group)[]) {
  for (const r of re) {
    regex.push(typeof r == "string" ? r : r.re);
  }
}

export function addReplacer(...re: (string | Group)[]) {
  for (const r of re) {
    replacer.push(typeof r == "string" ? r : r.group);
  }
}

export function addKeptGroup(re: string) {
  const group = addNewGroup(re);
  addReplacer(group);
  return group;
}

export function matchLetter(letter: string) {
  regex.push(`[^${letter}]*`);
  return addNewGroup(letter);
}

export function matchLetters(text: string) {
  return [...text].map(matchLetter);
}

export function matchDigits(largestDigit: number) {
  const digits: Group[] = [];
  for (let i = 0; i <= largestDigit; i++) {
    digits[i] = addNewGroup(`${i}`);
  }

  return digits;
}

export function matchNChars(char: string, n: number) {
  if (n == 0) return "";
  if (n < 5) return char.repeat(n);
  return `${char}{${n}}`;
}

export function point2idx(x: number, y: number) {
  return x * (width + 1) + y;
}

export function matchPoint(x: number, y: number) {
  const idx = point2idx(x, y);
  if (idx > width) return `[\\s\\S]{${idx}}`;
  if (idx > 0) return `.{${idx}}`;
  return "";
}

export function matchAnyPoint(points: Point[]) {
  return `(?:${points.map(([x, y]) => matchPoint(x, y)).join("|")})`;
}

export function buildRegex() {
  let outRegex = regex.join("");
  let outReplacer = replacer.join("");

  if (groupId < 100) {
    outRegex = outRegex.replace(/\?<g\d+>/g, "");
    outReplacer = outReplacer.replace(/[g<>]/g, "");
  } else {
    console.warn("100+ groups used. This will use named groups which are not supported in some places");
  }

  return {
    regex: outRegex,
    replacer: outReplacer,
    output: output.join("\n")
  };
}

export function printOutput(out: ReturnType<typeof buildRegex>) {
  console.log(`\x1b[1m\nRegex:\x1b[0m`);
  console.log(`\x1b[33m${out.regex}\x1b[0m`);
  console.log(`\x1b[1m\nReplacer:\x1b[0m`);
  console.log(`\x1b[33m${out.replacer}\x1b[0m`);
  console.log(`\x1b[1m\nText:\x1b[0m`);
  console.log(`\x1b[32m${out.output}\x1b[0m`);
  console.log("\x1b[0;2m\n-----------\x1b[0m");
}
