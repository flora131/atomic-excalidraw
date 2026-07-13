import React from "react";
import { reseed } from "@excalidraw/common";
import "@excalidraw/utils/test-utils";

import { Excalidraw } from "../index";

import { render, fireEvent } from "./test-utils";

const { h } = window;

beforeEach(() => {
  localStorage.clear();
  reseed(7);
});

const HIDDEN_CLASS = "selected-shape-actions-container--hidden";

describe("selected shape actions visibility while dragging", () => {
  it("hides the properties panel while moving an element and restores it on drop", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    const canvas = container.querySelector("canvas.interactive")!;

    // create a rectangle
    const tool = getByToolName("rectangle");
    fireEvent.click(tool);
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(canvas);

    // element is selected -> panel is rendered and not hidden
    expect(
      h.state.selectedElementIds[h.elements[0].id],
    ).toBeTruthy();

    const panel = () =>
      document.querySelector(".selected-shape-actions-container");

    expect(panel()).not.toBeNull();
    expect(panel()!.classList.contains(HIDDEN_CLASS)).toBe(false);

    // start dragging the element (pointerDown + pointerMove, before pointerUp)
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150 });

    expect(h.state.selectedElementsAreBeingDragged).toBe(true);
    expect(panel()).not.toBeNull();
    expect(panel()!.classList.contains(HIDDEN_CLASS)).toBe(true);

    // drop the element
    fireEvent.pointerUp(canvas);

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(panel()).not.toBeNull();
    expect(panel()!.classList.contains(HIDDEN_CLASS)).toBe(false);
  });
});
