import { addKeptGroup, addNewGroup, addReplacer, buildRegex, groupId, iter2d, matchLetter, matchLetters, output, Point, printOutput, regex } from "./util";

const X = "X";
const O = "O";
const EMPTY = "_";

const statesForO = new Map<string, number>();
const winStates = new Set<string>();

const visited = new Set<string>();

function getWinner(board: string[]): string | undefined {
  const indices = "012345678036147258048642";

  for (let i = 0; i < indices.length; i += 3) {
    const state = board[indices[i]];
    if (state != EMPTY && state == board[indices[i + 1]] && state == board[indices[i + 2]]) {
      return state;
    }
  }

  for (const x of board) if (x == EMPTY) return;
  return EMPTY;
}

function minimax(board: string[], isMaximizing: boolean) {
  const winner = getWinner(board);

  if (winner == X) return 1;
  if (winner == O) return -1;
  if (winner == EMPTY) return 0;

  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i] != EMPTY) continue;
    
    if (isMaximizing) {
      board[i] = X;
      bestScore = Math.max(bestScore, minimax(board, false));
    } else {
      board[i] = O;
      bestScore = Math.min(bestScore, minimax(board, true));
    }

    board[i] = EMPTY;
  }

  return bestScore;
}

function getBestMoveForO(board: string[]) {
  let bestScore = Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] != EMPTY) continue;

    board[i] = O;
    const score = minimax(board, true);
    board[i] = EMPTY;

    if (score < bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

function generateTree(board: string[], turn: string) {
  const state = board.join("");
  if (visited.has(state)) return;
  visited.add(state);

  const winner = getWinner(board);
  if (winner) {
    return;
  }

  if (turn == O) {
    const bestMove = getBestMoveForO(board);
    statesForO.set(state, bestMove);
    
    if (bestMove == -1) throw-1;

    board[bestMove] = O;
  
    const winner = getWinner(board);
    if (winner == O) {
      winStates.add(state);
    } else {
      generateTree(board, X);
    }

    board[bestMove] = EMPTY;
  } else for (let i = 0; i < 9; i++) {
    if (board[i] != EMPTY) continue;

    board[i] = X;
    generateTree(board, O);
    board[i] = EMPTY;
  }
}

generateTree(new Array(9).fill(EMPTY), X);
console.log("Generated", statesForO.size, "possible states for O and", winStates.size, "win states");

// this is shitty but i dont care this is a PoC anyway!!!
const mk = (): string[][] => Array.from({ length: 9 }, () => []);
const moveGroups = mk();
const winGroups = mk();

for (const [state, move] of statesForO) {
  (winStates.has(state) ? winGroups : moveGroups)[move].push(state);
}

function play(groups: string[][]) {
  regex.push("(?:");
  for (let move = 0; move < groups.length; move++) {
    regex.push(
      `(?=${
        groups[move]
          .map((x) => x.match(/.../g)!.join("\\n"))
          .join("|")
      })`
    );
  
    const idx = move + Math.floor(move / 3);
    if (idx > 0) addKeptGroup(`[\\s\\S]{${idx}}`);

    regex.push("|");
  }
  
  regex.pop();
  regex.push(")");
  regex.push(EMPTY);
  
  regex.push("(?=[^:]+: ");
  const UpO = addKeptGroup("O");
  regex.push(")");

  return UpO;
}

function winDetection() {
  const UpO = play(winGroups);

  addKeptGroup("[^P]+");
  const [N, _, W, O, EXCLAMATION] = matchLetters("n wo!");

  addReplacer(UpO, _, W, O, N, EXCLAMATION);
}

function tieDetection() {
  addKeptGroup("[^_P]+");
  regex.push("P.");

  const A = addNewGroup("a"); regex.push(".");
  const I = addNewGroup("i");
  const S = matchLetter("s");
  const T = addNewGroup("t"); regex.push(".");
  const _ = addNewGroup(" ");
  const [E, EXCLAMATION] = matchLetters("e!");

  addReplacer(I, T, S, _, A, _, T, I, E, EXCLAMATION);
}

addKeptGroup("^[^v]+v\\n\\n");
regex.push("(?:");

play(moveGroups);
regex.push("|");
winDetection();
regex.push("|");
tieDetection();

regex.push(")");

addKeptGroup("[\\s\\S]*$");

output.push(
  "Regex Tic Tac Toe by yui.dev",
  "",
  "___",
  "___",
  "___",
  "",
  "Playing against: O",
  "Replace a cell with X and run the regex to make a move!"
);

console.log(groupId, "groups");
printOutput(buildRegex());

// regex.push();

// console.log(moveGroups)
