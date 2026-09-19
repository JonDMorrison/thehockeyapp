import assert from "node:assert/strict";
import { getNextProgramWeekStart } from "../src/lib/programStartDate.ts";

const cases = [
  {
    label: "Saturday onboarding",
    input: new Date(2026, 8, 19, 12),
    expected: new Date(2026, 8, 21, 0),
  },
  {
    label: "Sunday onboarding",
    input: new Date(2026, 8, 20, 12),
    expected: new Date(2026, 8, 21, 0),
  },
  {
    label: "Monday onboarding",
    input: new Date(2026, 8, 14, 12),
    expected: new Date(2026, 8, 21, 0),
  },
];

for (const testCase of cases) {
  assert.deepEqual(
    getNextProgramWeekStart(testCase.input),
    testCase.expected,
    `${testCase.label} should schedule the next Monday`,
  );
}

console.log(`Template start-date checks passed (${cases.length}).`);
