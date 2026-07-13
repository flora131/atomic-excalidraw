import React from "react";
import { reseed } from "@excalidraw/common";

import { Excalidraw } from "../index";

import { UI } from "./helpers/ui";
import { render, fireEvent } from "./test-utils";

const { h } = window;

beforeEach(() => {
  localStorage.clear();
  reseed(7);
});

describe("selected-shape-actions panel during drag", () => {
  it("hides the panel while dragging a selected element and restores it on pointer-up", async () => {
    const { container } = await render(<Excalidraw />);
    const canvas = container.querySelector("canvas.interactive")!;

    // create and select a rectangle
    const rect = UI.createElement("rectangle", {
      x: 30,
      y: 20,
      width: 100,
      height: 100,
    });

    expect(h.state.selectedElementIds[rect.id]).toBeTruthy();

    const panel = container.querySelector(".selected-shape-actions-container")!;
    expect(panel).toBeTruthy();

    // panel is visible on selection (not hidden)
    expect(
      panel.classList.contains("selected-shape-actions-container--dragging"),
    ).toBe(false);

    // start dragging the element
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 40 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 90 });

    // mid-drag: the drag state is engaged and the panel is hidden
    expect(h.state.selectedElementsAreBeingDragged).toBe(true);
    expect(
      panel.classList.contains("selected-shape-actions-container--dragging"),
    ).toBe(true);

    // release the pointer
    fireEvent.pointerUp(canvas);

    // after pointer-up: drag state cleared and the panel is visible again
    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(
      panel.classList.contains("selected-shape-actions-container--dragging"),
    ).toBe(false);
  });
});
