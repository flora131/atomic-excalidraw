import React from "react";
import { arrayToMap, reseed } from "@excalidraw/common";

import { getTransformHandles } from "@excalidraw/element";

import type { TransformHandleType } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Pointer, UI } from "./helpers/ui";
import {
  act,
  render,
  unmountComponent,
  withExcalidrawDimensions,
} from "./test-utils";

unmountComponent();

const { h } = window;
const mouse = new Pointer("mouse");

const getShapeActions = (selector = ".Island > .selected-shape-actions") => {
  const actions = document.querySelector<HTMLElement>(selector);
  expect(actions).not.toBeNull();
  return actions!;
};

const expectVisible = (actions: HTMLElement) => {
  expect(actions.isConnected).toBe(true);
  expect(actions.classList.contains("shape-actions--hidden")).toBe(false);
};

const getTransformHandleCenter = (
  element: ExcalidrawElement,
  handle: TransformHandleType,
) => {
  const transformHandle = getTransformHandles(
    element,
    h.state.zoom,
    arrayToMap(h.elements),
    "mouse",
    {},
  )[handle];

  if (!transformHandle) {
    throw new Error(`Missing ${handle} transform handle`);
  }

  return [
    transformHandle[0] + transformHandle[2] / 2,
    transformHandle[1] + transformHandle[3] / 2,
  ] as const;
};

const assertHiddenDuringGesture = (
  actions: HTMLElement,
  start: readonly [number, number],
  move: readonly [number, number],
  expectStats = true,
) => {
  mouse.reset();
  mouse.downAt(...start);
  expectVisible(actions);

  mouse.moveTo(start[0] + move[0], start[1] + move[1]);
  expect(actions.isConnected).toBe(true);
  expect(actions.classList.contains("shape-actions--hidden")).toBe(true);
  if (expectStats) {
    expect(UI.queryStats()).not.toBeNull();
  }

  mouse.upAt();
  expectVisible(actions);
};

beforeEach(() => {
  localStorage.clear();
  reseed(7);
});

describe("shape actions during element transformations", () => {
  it("keeps the full actions mounted and hides them only after dragging starts", async () => {
    await render(<Excalidraw />);
    const rectangle = UI.createElement("rectangle", {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    });
    act(() => h.setState({ stats: { ...h.state.stats, open: true } }));

    const actions = getShapeActions();
    expectVisible(actions);
    expect(UI.queryStats()).not.toBeNull();

    assertHiddenDuringGesture(
      actions,
      [rectangle.x + 50, rectangle.y + 50],
      [30, 20],
    );
  });

  it.each([
    ["resizing", "se", [25, 20]],
    ["rotating", "rotation", [30, 15]],
  ] as const)(
    "keeps the full actions mounted while %s and restores them on pointer-up",
    async (_name, handle, move) => {
      await render(<Excalidraw />);
      const rectangle = UI.createElement("rectangle", {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });
      act(() => h.setState({ stats: { ...h.state.stats, open: true } }));

      const actions = getShapeActions();
      assertHiddenDuringGesture(
        actions,
        getTransformHandleCenter(rectangle, handle),
        move,
      );
    },
  );

  it("keeps the full actions mounted while dragging a multi-selection", async () => {
    await render(<Excalidraw />);
    const first = UI.createElement("rectangle", {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    });
    const second = UI.createElement("rectangle", {
      x: 300,
      y: 100,
      width: 100,
      height: 100,
    });
    mouse.select([first, second]);
    act(() => h.setState({ stats: { ...h.state.stats, open: true } }));

    const actions = getShapeActions();
    assertHiddenDuringGesture(actions, [first.x + 50, first.y + 50], [30, 20]);
  });

  it.each([
    [
      "compact",
      { width: 900, height: 700 },
      ".compact-shape-actions-island > .compact-shape-actions",
    ],
    ["mobile", { width: 800, height: 400 }, ".mobile-shape-actions"],
  ] as const)(
    "keeps the %s actions mounted through the pointer gesture lifecycle",
    async (_variant, dimensions, selector) => {
      await render(<Excalidraw />);

      await withExcalidrawDimensions(dimensions, async () => {
        const rectangle = API.createElement({
          type: "rectangle",
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          backgroundColor: "red",
        });
        API.setElements([rectangle]);
        mouse.reset();
        mouse.click(rectangle.x + 50, rectangle.y + 50);
        const actions = getShapeActions(selector);

        expectVisible(actions);
        assertHiddenDuringGesture(
          actions,
          [rectangle.x + 50, rectangle.y + 50],
          [30, 20],
          false,
        );
      });
    },
  );
});
