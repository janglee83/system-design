// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EngineClient } from "../../engine/client";
import { EngineProvider } from "../../engine/EngineProvider";
import { FakeWorker } from "../../test/engine-fixtures";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import type { createPlaybackStore } from "../store/playback-store";
import { LabStoresProvider, usePlaybackApi } from "../store/LabStores";
import type { RunRecord } from "../store/run-store";
import { EventsTab } from "./EventsTab";

const run = {
  id: 1,
  input: { durationMs: 10_000 },
  events: [
    { atMs: 1500, node: "web", code: "node.overloaded", params: {} },
    { atMs: 4000, node: "web", code: "instance.down", params: { remaining: 1 } },
  ],
  snapshot: { nodes: [{ id: "web", kind: "web-server", label: "API" }], edges: [], warnings: [] },
} as unknown as RunRecord;

let playback!: ReturnType<typeof createPlaybackStore>;
function Grab() {
  playback = usePlaybackApi();
  return null;
}

describe("EventsTab", () => {
  it("Enter and Space on a row move the playhead to that event", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <EngineProvider makeClient={() => new EngineClient(() => new FakeWorker())}>
          <LabStoresProvider>
            <Grab />
            <EventsTab run={run} />
          </LabStoresProvider>
        </EngineProvider>
      </NextIntlClientProvider>,
    );
    playback.getState().reset(10_000);
    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.keyDown(rows[1]!, { key: " " });
    expect(playback.getState().timeMs).toBe(4000);
    fireEvent.keyDown(rows[0]!, { key: "Enter" });
    expect(playback.getState().timeMs).toBe(1500);
  });
});
