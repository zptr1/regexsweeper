import { addKeptGroup, addNewGroup, addReplacer, buildRegex, groupId, iter2d, output, Point, printOutput, regex } from "./util";

const X = "X";
const O = "O";
const EMPTY = "_";

const statesForO = new Map<string, number>();
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
    generateTree(board, X);
    board[bestMove] = EMPTY;
  } else for (let i = 0; i < 9; i++) {
    if (board[i] != EMPTY) continue;

    board[i] = X;
    generateTree(board, O);
    board[i] = EMPTY;
  }
}

generateTree(new Array(9).fill(EMPTY), X);
console.log("Generated", statesForO.size, "possible states");

const moveGroups: string[][] = Array.from({ length: 9 }, () => []);
for (const [state, move] of statesForO) {
  moveGroups[move].push(state);
}

regex.push("^[^y]+y\\n\\n(?:");
for (let move = 0; move < moveGroups.length; move++) {
  const states = moveGroups[move];

  regex.push(
    `(?=${
      states
        .map((x) => x.match(/.../g)!.join("\\n"))
        .join("|")
    })`
  );

  const idx = move + Math.floor(move / 3);

  if (idx > 0) addKeptGroup(`[\\s\\S]{${idx}}`);
  regex.push(EMPTY);
  const rest = addNewGroup("[^:]+: ");
  const O = addNewGroup("O");

  addReplacer(O, rest, O);
  addKeptGroup("[\\s\\S]*$");

  regex.push("|");
}

regex.pop();
regex.push(")");

output.push("Regex Tic Tac Toe by yui.dev");
output.push("");
output.push("___");
output.push("___");
output.push("___");
output.push("");
output.push("Playing against: O");
output.push("Replace a cell with X and run the regex to play!");

console.log(groupId, "groups");
printOutput(buildRegex());

// regex.push();

// console.log(moveGroups)
