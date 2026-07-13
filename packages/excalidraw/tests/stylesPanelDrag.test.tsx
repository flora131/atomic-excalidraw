import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import React from "react";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { fireEvent, render, withExcalidrawDimensions } from "./test-utils";

const { compileString } = createRequire(resolve(process.cwd(), "package.json"))(
  "sass",
) as {
  compileString: (source: string) => { css: string };
};

const actionsStylesSource = readFileSync(
  resolve(process.cwd(), "packages/excalidraw/components/Actions.scss"),
  "utf8",
);

const { h } = window;

let actionsStyleElement: HTMLStyleElement;

beforeAll(() => {
  const stylesPanelRulesStart = actionsStylesSource.indexOf(
    ".styles-panel-island",
  );
  const stylesPanelRulesEnd = actionsStylesSource.indexOf(
    ".compact-shape-actions",
    stylesPanelRulesStart,
  );
  if (stylesPanelRulesStart < 0 || stylesPanelRulesEnd < 0) {
    throw new Error("Could not load styles panel rules from Actions.scss");
  }
  actionsStyleElement = document.createElement("style");
  actionsStyleElement.textContent = compileString(
    actionsStylesSource.slice(stylesPanelRulesStart, stylesPanelRulesEnd),
  ).css;
  document.head.append(actionsStyleElement);
});

afterAll(() => {
  actionsStyleElement?.remove();
});

const formFactors = [
  ["desktop", { width: 1440, height: 900 }, ".App-menu__left"],
  ["tablet", { width: 800, height: 1000 }, ".compact-shape-actions-island"],
  ["phone", { width: 390, height: 800 }, ".mobile-shape-actions"],
] as const;

type StylesPanelStyles = {
  opacity: string;
  panelPointerEvents: string;
  descendantPointerEvents: string;
};

const getStylesPanelStyles = (
  stylesPanel: Element,
  descendant: Element,
): StylesPanelStyles => ({
  opacity: getComputedStyle(stylesPanel).opacity,
  panelPointerEvents: getComputedStyle(stylesPanel).pointerEvents,
  descendantPointerEvents: getComputedStyle(descendant).pointerEvents,
});

const assertStylesPanelVisible = (
  stylesPanel: Element,
  descendant: Element,
  originalStyles: StylesPanelStyles,
) => {
  expect(stylesPanel).not.toHaveClass("styles-panel-island--dragging");
  expect(getStylesPanelStyles(stylesPanel, descendant)).toEqual(originalStyles);
};

const assertStylesPanelHidden = (stylesPanel: Element, descendant: Element) => {
  expect(stylesPanel).toHaveClass("styles-panel-island--dragging");
  expect(getComputedStyle(stylesPanel).opacity).toBe("0");
  expect(getComputedStyle(stylesPanel).transition).toBe("opacity 80ms ease");
  expect(getComputedStyle(stylesPanel).pointerEvents).toBe("none");
  expect(getComputedStyle(descendant).pointerEvents).toBe("none");
};

const selectRectangle = () => {
  const rectangle = API.createElement({
    type: "rectangle",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
  });
  API.setElements([rectangle]);
  API.setSelectedElements([rectangle]);
};

const startSelectedElementDrag = (canvas: HTMLCanvasElement) => {
  fireEvent.pointerDown(canvas, {
    clientX: 150,
    clientY: 150,
    pointerType: "mouse",
    pointerId: 1,
  });
  fireEvent.pointerMove(canvas, {
    clientX: 170,
    clientY: 170,
    pointerType: "mouse",
    pointerId: 1,
  });
};

const finishSelectedElementDrag = (
  canvas: HTMLCanvasElement,
  event: "pointerUp" | "pointerCancel",
) => {
  fireEvent[event](canvas, {
    clientX: 170,
    clientY: 170,
    pointerType: "mouse",
    pointerId: 1,
  });
};

describe.each(formFactors)(
  "%s styles panel",
  (formFactor, dimensions, surfaceSelector) => {
    it("stays mounted and fades only while dragging a selected element", async () => {
      const { container } = await render(<Excalidraw />);

      await withExcalidrawDimensions(dimensions, () => {
        expect(h.app.editorInterface.formFactor).toBe(formFactor);
        selectRectangle();

        const canvas =
          container.querySelector<HTMLCanvasElement>("canvas.interactive")!;
        const stylesPanel = container.querySelector(surfaceSelector)!;
        const descendant = stylesPanel.querySelector("button, input, select")!;
        expect(stylesPanel).toHaveClass("styles-panel-island");
        expect(h.state.selectedElementsAreBeingDragged).toBe(false);
        const originalStyles = getStylesPanelStyles(stylesPanel, descendant);
        assertStylesPanelVisible(stylesPanel, descendant, originalStyles);

        fireEvent.pointerDown(canvas, {
          clientX: 150,
          clientY: 150,
          pointerType: "mouse",
          pointerId: 1,
        });

        try {
          expect(h.state.selectedElementsAreBeingDragged).toBe(false);
          assertStylesPanelVisible(stylesPanel, descendant, originalStyles);
          expect(container.querySelector(surfaceSelector)).toBe(stylesPanel);

          fireEvent.pointerMove(canvas, {
            clientX: 170,
            clientY: 170,
            pointerType: "mouse",
            pointerId: 1,
          });

          expect(h.state.selectedElementsAreBeingDragged).toBe(true);
          assertStylesPanelHidden(stylesPanel, descendant);
          expect(container.querySelector(surfaceSelector)).toBe(stylesPanel);
        } finally {
          finishSelectedElementDrag(canvas, "pointerUp");
        }

        expect(h.state.selectedElementsAreBeingDragged).toBe(false);
        assertStylesPanelVisible(stylesPanel, descendant, originalStyles);
        expect(container.querySelector(surfaceSelector)).toBe(stylesPanel);
      });
    });
  },
);

describe("styles panel drag cleanup", () => {
  it("restores the same styles panel after pointercancel", async () => {
    const { container } = await render(<Excalidraw />);

    await withExcalidrawDimensions({ width: 1440, height: 900 }, () => {
      selectRectangle();

      const canvas =
        container.querySelector<HTMLCanvasElement>("canvas.interactive")!;
      const stylesPanel = container.querySelector(".App-menu__left")!;
      const descendant = stylesPanel.querySelector("button, input, select")!;
      const originalStyles = getStylesPanelStyles(stylesPanel, descendant);

      try {
        startSelectedElementDrag(canvas);
        expect(h.state.selectedElementsAreBeingDragged).toBe(true);
        assertStylesPanelHidden(stylesPanel, descendant);
      } finally {
        finishSelectedElementDrag(canvas, "pointerCancel");
      }

      expect(h.state.selectedElementsAreBeingDragged).toBe(false);
      assertStylesPanelVisible(stylesPanel, descendant, originalStyles);
      expect(container.querySelector(".App-menu__left")).toBe(stylesPanel);
    });
  });

  it("restores the bounding-client-rect mock after a throwing callback", async () => {
    await render(<Excalidraw />);
    const originalGetBoundingClientRect =
      window.HTMLDivElement.prototype.getBoundingClientRect;
    const error = new Error("test callback failure");

    await expect(
      withExcalidrawDimensions({ width: 800, height: 600 }, () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(window.HTMLDivElement.prototype.getBoundingClientRect).toBe(
      originalGetBoundingClientRect,
    );
  });
});
