import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { ODRE_NOTE_SEEDS } from "@/data/odreNotes";
import {
  buildOdreNotePlanBridge,
  deriveThemesFromNote,
  deriveTravelPurposeFromNote,
  extractOdreNotePlaceHints,
  resolveOdreNotePlaceIds,
} from "@/lib/odreNotePlanBridge";

describe("odreNotePlanBridge", () => {
  const mukhoNote = ODRE_NOTE_SEEDS.find((note) => note.id === "note-mukho-alley");
  if (!mukhoNote) throw new Error("missing note-mukho-alley seed");

  it("extracts route hints from travelMemo", () => {
    const hints = extractOdreNotePlaceHints(mukhoNote.travelMemo, mukhoNote.placeKeywords);
    assert.ok(hints.some((hint) => hint.includes("논골")));
    assert.ok(hints.some((hint) => hint.includes("묵호") || hint.includes("등대")));
  });

  it("resolves catalog place ids for mukho note", () => {
    const ids = resolveOdreNotePlaceIds(mukhoNote);
    assert.ok(ids.length > 0);
    assert.ok(ids.includes("nongol-alley") || ids.includes("mukho-lighthouse"));
  });

  it("builds plan bridge with zone and teaser", () => {
    const bridge = buildOdreNotePlanBridge(mukhoNote, defaultPreferences);
    assert.equal(bridge.context.zoneId, "samcheok-donghae");
    assert.equal(bridge.context.planHint.lines[0].length > 0, true);
    assert.ok(bridge.placeSelections.length > 0);
    assert.equal(bridge.preferences.zoneId, "samcheok-donghae");
    assert.equal(bridge.context.lockedTravelPurpose, bridge.preferences.travelPurpose);
    assert.deepEqual(bridge.context.lockedThemes, bridge.preferences.themes);
  });

  it("derives purpose and themes from note text", () => {
    const coffee = ODRE_NOTE_SEEDS.find((note) => note.id === "note-gangneung-coffee");
    const festival = ODRE_NOTE_SEEDS.find((note) => note.id === "note-jeongseon-festival");
    const autumn = ODRE_NOTE_SEEDS.find((note) => note.id === "note-gangwon-autumn-drive");
    if (!coffee || !festival || !autumn) throw new Error("missing sample seeds");

    assert.equal(deriveTravelPurposeFromNote(coffee), "food");
    assert.ok(deriveThemesFromNote(coffee, "food").includes("culture"));

    assert.equal(deriveTravelPurposeFromNote(festival), "leisure");
    assert.ok(deriveThemesFromNote(festival, "leisure").includes("culture"));

    assert.equal(deriveTravelPurposeFromNote(autumn), "drive");
    assert.ok(deriveThemesFromNote(autumn, "drive").includes("nature"));
  });
});
