import { describe, expect, it } from "vitest";
import { findTicTacToeWinner, shuffledWord } from "./game-utils";

describe("ChatPlay game utilities", () => {
  it("detects wins and draws in Tic-Tac-Toe", () => {
    expect(findTicTacToeWinner(["X", "X", "X", null, null, null, null, null, null])).toBe("X");
    expect(findTicTacToeWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");
  });

  it("keeps every character when scrambling a word", () => {
    expect(shuffledWord("orbit").split("").sort()).toEqual("ORBIT".split("").sort());
  });
});
