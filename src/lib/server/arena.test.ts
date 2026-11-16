import { expect, test } from "vitest";
import { pair, ratings } from "./arena.ts";

test("winner gains what loser loses, unknown ids ignored", () => {
  const r = ratings(
    ["A", "B"],
    [
      { winner: "A", loser: "B", at: "" },
      { winner: "A", loser: "GONE", at: "" },
    ],
  );
  expect(r.get("A")!.elo).toBe(1516);
  expect(r.get("B")!.elo).toBe(1484);
  expect(r.get("A")!.games).toBe(1);
});

test("pair returns two distinct stories", () => {
  const rated = [...ratings(["A", "B", "C"], []).values()];
  for (let i = 0; i < 100; i++) {
    const [a, b] = pair(rated);
    expect(a).not.toBe(b);
  }
});
