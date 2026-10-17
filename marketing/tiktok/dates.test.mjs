import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countdown,
  daysBetween,
  releaseOrder,
  releaseParts,
} from "./dates.mjs";

test("a full date is exact, without a leading zero on the day", () => {
  assert.deepEqual(releaseParts("2026-11-05"), {
    year: "2026",
    month: "Nov",
    day: "5",
    exact: true,
  });
});

test("a year or a month alone is not exact", () => {
  assert.deepEqual(releaseParts("2027"), { year: "2027", exact: false });
  assert.deepEqual(releaseParts("2027-03"), {
    year: "2027",
    month: "Mar",
    exact: false,
  });
});

test("a month out of range is refused rather than shown blank", () => {
  assert.throws(() => releaseParts("2027-13-01"));
});

test("days between counts whole days across a clock change", () => {
  // EEST ends on 25 October; dates are parsed as UTC, so it doesn't matter.
  assert.equal(daysBetween("2026-10-23", "2026-11-19"), 27);
  assert.equal(daysBetween("2026-10-23", "2026-10-23"), 0);
});

test("countdown stays in days for a year, then months", () => {
  assert.deepEqual(countdown(0), { lead: "Out", figure: "today", unit: "" });
  assert.deepEqual(countdown(1), { lead: "Out", figure: "tomorrow", unit: "" });
  assert.deepEqual(countdown(-3), { lead: "Out", figure: "now", unit: "" });
  assert.deepEqual(countdown(27), { lead: "In", figure: "27", unit: "days" });
  assert.deepEqual(countdown(116), { lead: "In", figure: "116", unit: "days" });
  assert.deepEqual(countdown(365), { lead: "In", figure: "365", unit: "days" });
  assert.deepEqual(countdown(400), {
    lead: "In",
    figure: "13",
    unit: "months",
  });
});

test("a release known only by year or month sorts after the dated ones", () => {
  const dates = ["2027", "2026-12-10", "2027-03", "2027-02-23", "2026"];
  assert.deepEqual(dates.sort(releaseOrder), [
    "2026-12-10",
    "2026",
    "2027-02-23",
    "2027-03",
    "2027",
  ]);
});
