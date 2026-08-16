import { describe, expect, it } from "vitest";
import { findTicTacToeWinner, shuffledWord } from "../client/src/lib/game-utils";

describe("ChatPlay game rules", () => {
  it("recognizes row wins, diagonal wins, and completed draws", () => {
    expect(findTicTacToeWinner(["X", "X", "X", null, null, null, null, null, null])).toBe("X");
    expect(findTicTacToeWinner(["O", "X", "X", "X", "O", null, null, null, "O"])).toBe("O");
    expect(findTicTacToeWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");
  });

  it("preserves every character when scrambling a host word", () => {
    expect(shuffledWord("galaxy").split("").sort()).toEqual("GALAXY".split("").sort());
  });
});
