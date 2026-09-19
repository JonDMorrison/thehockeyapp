import assert from "node:assert/strict";
import { rankProgramTemplates } from "../src/lib/templateRanking.ts";

const templates = [
  { id: "u11-a", age_divisions: ["U11"], levels: ["A"] },
  { id: "u13-house", age_divisions: ["U13"], levels: ["House"] },
  { id: "u13-a", age_divisions: ["U13"], levels: ["A"] },
  { id: "u15-aa", age_divisions: ["U15"], levels: ["AA"] },
];

assert.deepEqual(
  rankProgramTemplates(templates, "U13", "A").map(({ id }) => id),
  ["u13-a", "u13-house", "u11-a"],
  "exact age and level must rank before partial matches",
);

assert.deepEqual(
  rankProgramTemplates(templates, "U9", "Rep").map(({ id }) => id),
  templates.map(({ id }) => id),
  "all templates remain available when nothing matches",
);

console.log("Template ranking checks passed (2).");
