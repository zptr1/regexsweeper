export const regex: string[] = [];
export const replacer: string[] = [];
export const output: string[] = [];

export type Point = [number, number];
export type Group = { re: string; group: string };

export let groupId = 0;
export const getGroupId = () => `g${++groupId}`;

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

export function iter2d(width: number, height: number, fn: (x: number, y: number) => void, rowFn?: (x: number) => void) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      fn(x, y);
    }

    if (rowFn) rowFn(x);
  }
}

export function iterNeighbors(width: number, height: number, x: number, y: number, fn: (dx: number, dy: number) => void) {
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
  addReplacer(addNewGroup(re));
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
