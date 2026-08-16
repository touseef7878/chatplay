export type GameKind = "tic_tac_toe" | "word_scramble" | "trivia";

export const TRIVIA_QUESTIONS = [
  { prompt: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Mercury"], answer: 0 },
  { prompt: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: 2 },
  { prompt: "How many sides does a hexagon have?", options: ["Five", "Six", "Seven", "Eight"], answer: 1 },
] as const;

export function shuffledWord(word: string) {
  const chars = word.trim().toUpperCase().split("");
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const shuffled = chars.join("");
  return shuffled === word.trim().toUpperCase() ? chars.reverse().join("") : shuffled;
}

export function findTicTacToeWinner(board: Array<string | null>) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? "draw" : null;
}
