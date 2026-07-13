import React from "react";
import { vi } from "vitest";
import { KEYS, reseed, setDesktopUIMode } from "@excalidraw/common";
import { bindBindingElement } from "@excalidraw/element";
import "@excalidraw/utils/test-utils";

import type {
  ExcalidrawArrowElement,
  ExcalidrawBindableElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import * as InteractiveCanvas from "../renderer/interactiveScene";
import * as StaticScene from "../renderer/staticScene";

import { UI, Pointer, Keyboard } from "./helpers/ui";
import { render, fireEvent, act, unmountComponent } from "./test-utils";

unmountComponent();

const renderInteractiveScene = vi.spyOn(
  InteractiveCanvas,
  "renderInteractiveScene",
);
const renderStaticScene = vi.spyOn(StaticScene, "renderStaticScene");

beforeEach(() => {
  localStorage.clear();
  renderInteractiveScene.mockClear();
  renderStaticScene.mockClear();
  reseed(7);
});

const { h } = window;

describe("move element", () => {
  it("rectangle", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    const canvas = container.querySelector("canvas.interactive")!;

    {
      // create element
      const tool = getByToolName("rectangle");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);

      expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(
        `5`,
      );
      expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`5`);
      expect(h.state.selectionElement).toBeNull();
      expect(h.elements.length).toEqual(1);
      expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();
      expect([h.elements[0].x, h.elements[0].y]).toEqual([30, 20]);

      renderInteractiveScene.mockClear();
      renderStaticScene.mockClear();
    }

    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 20 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 40 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(`3`);
    expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`2`);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(1);
    expect([h.elements[0].x, h.elements[0].y]).toEqual([0, 40]);

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });

  it("rectangles with binding arrow", async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);

    // create elements
    const rectA = UI.createElement("rectangle", { size: 100 });
    const rectB = UI.createElement("rectangle", { x: 200, y: 0, size: 300 });
    const arrow = UI.createElement("arrow", { x: 105, y: 50, size: 88 });

    act(() => {
      // bind line to two rectangles
      bindBindingElement(
        arrow.get() as NonDeleted<ExcalidrawArrowElement>,
        rectA.get() as NonDeleted<ExcalidrawBindableElement>,
        "orbit",
        "start",
        h.app.scene,
      );
      bindBindingElement(
        arrow.get() as NonDeleted<ExcalidrawArrowElement>,
        rectB.get() as NonDeleted<ExcalidrawBindableElement>,
        "orbit",
        "end",
        h.app.scene,
      );
    });

    // select the second rectangle
    new Pointer("mouse").clickOn(rectB);

    expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(
      `16`,
    );
    expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`15`);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(3);
    expect(h.state.selectedElementIds[rectB.id]).toBeTruthy();
    expect([rectA.x, rectA.y]).toEqual([0, 0]);
    expect([rectB.x, rectB.y]).toEqual([200, 0]);
    expect([[arrow.x, arrow.y]]).toCloselyEqualPoints(
      [[106.00000000000001, 55.6867741935484]],
      0,
    );
    expect([[arrow.width, arrow.height]]).toCloselyEqualPoints([[88, 88]], 0);

    renderInteractiveScene.mockClear();
    renderStaticScene.mockClear();

    // Move selected rectangle
    Keyboard.keyDown(KEYS.ARROW_RIGHT);
    Keyboard.keyDown(KEYS.ARROW_DOWN);
    Keyboard.keyDown(KEYS.ARROW_DOWN);

    // Check that the arrow size has been changed according to moving the rectangle
    expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(`3`);
    expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`3`);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(3);
    expect(h.state.selectedElementIds[rectB.id]).toBeTruthy();
    expect([rectA.x, rectA.y]).toEqual([0, 0]);
    expect([rectB.x, rectB.y]).toEqual([201, 2]);
    expect([[arrow.x, arrow.y]]).toCloselyEqualPoints(
      [[106, 55.6867741935484]],
      0,
    );
    expect([[arrow.width, arrow.height]]).toCloselyEqualPoints([[89, 90]], 0);

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });
});

describe("duplicate element on move when ALT is clicked", () => {
  it("rectangle", async () => {
    const { getByToolName, container } = await render(<Excalidraw />);
    const canvas = container.querySelector("canvas.interactive")!;

    {
      // create element
      const tool = getByToolName("rectangle");
      fireEvent.click(tool);
      fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20 });
      fireEvent.pointerMove(canvas, { clientX: 60, clientY: 70 });
      fireEvent.pointerUp(canvas);

      expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(
        `5`,
      );
      expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`5`);
      expect(h.state.selectionElement).toBeNull();
      expect(h.elements.length).toEqual(1);
      expect(h.state.selectedElementIds[h.elements[0].id]).toBeTruthy();
      expect([h.elements[0].x, h.elements[0].y]).toEqual([30, 20]);

      renderInteractiveScene.mockClear();
      renderStaticScene.mockClear();
    }

    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 20 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 40, altKey: true });

    // firing another pointerMove event with alt key pressed should NOT trigger
    // another duplication
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 40, altKey: true });
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 60 });
    fireEvent.pointerUp(canvas);

    expect(renderInteractiveScene.mock.calls.length).toMatchInlineSnapshot(`4`);
    expect(renderStaticScene.mock.calls.length).toMatchInlineSnapshot(`3`);
    expect(h.state.selectionElement).toBeNull();
    expect(h.elements.length).toEqual(2);

    // previous element should stay intact
    expect([h.elements[0].x, h.elements[0].y]).toEqual([30, 20]);
    expect([h.elements[1].x, h.elements[1].y]).toEqual([-10, 60]);

    h.elements.forEach((element) => expect(element).toMatchSnapshot());
  });
});

describe("properties panel while moving selected elements", () => {
  const stylesPanelSelector = '[data-viewport-ui-name="stylesPanel"]';

  const createAndSelectRectangle = () => {
    const rectangle = UI.createElement("rectangle", {
      x: 100,
      y: 100,
      size: 100,
    });
    new Pointer("mouse").clickOn(rectangle);
    return rectangle;
  };

  it("hides the full styles panel only while the selected element is moving", async () => {
    unmountComponent();
    const { container } = await render(<Excalidraw />);
    const rectangle = createAndSelectRectangle();
    const pointer = new Pointer("mouse");

    expect(h.app.editorInterface.formFactor).toBe("desktop");
    expect(h.app.editorInterface.desktopUIMode).toBe("full");
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();

    pointer.downAt(rectangle.x + rectangle.width / 2, rectangle.y);

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();

    pointer.moveTo(rectangle.x + rectangle.width / 2 + 20, rectangle.y + 20);

    expect(h.state.selectedElementsAreBeingDragged).toBe(true);
    expect(container.querySelector(stylesPanelSelector)).toBeNull();

    pointer.upAt();

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();
  });

  it("ends the drag and restores the styles panel when movement is canceled", async () => {
    const onPointerUp = vi.fn();
    unmountComponent();
    const { container } = await render(
      <Excalidraw onPointerUp={onPointerUp} />,
    );
    const canvas = container.querySelector("canvas.interactive")!;
    const rectangle = createAndSelectRectangle();
    const pointer = new Pointer("mouse");
    onPointerUp.mockClear();

    pointer.downAt(rectangle.x + rectangle.width / 2, rectangle.y);
    pointer.moveTo(rectangle.x + rectangle.width / 2 + 20, rectangle.y + 20);

    expect([rectangle.x, rectangle.y]).toEqual([120, 120]);
    expect(h.state.selectedElementsAreBeingDragged).toBe(true);
    expect(container.querySelector(stylesPanelSelector)).toBeNull();

    fireEvent.pointerCancel(canvas, {
      clientX: 170,
      clientY: 120,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();
    expect(onPointerUp).toHaveBeenCalledTimes(1);

    pointer.moveTo(190, 140);

    expect([rectangle.x, rectangle.y]).toEqual([120, 120]);
    expect(h.state.selectedElementsAreBeingDragged).toBe(false);

    pointer.upAt();

    expect(onPointerUp).toHaveBeenCalledTimes(1);
  });

  it("hides the desktop compact styles panel only while the selected element is moving", async () => {
    setDesktopUIMode("compact");
    unmountComponent();
    const { container } = await render(
      <Excalidraw UIOptions={{ getFormFactor: () => "desktop" }} />,
    );
    act(() => {
      h.app.refreshEditorInterface();
      h.app.refresh();
    });
    const rectangle = createAndSelectRectangle();
    act(() => {
      h.setState({ penDetected: true });
    });
    const pointer = new Pointer("mouse");

    expect(h.app.editorInterface.formFactor).toBe("desktop");
    expect(h.app.editorInterface.desktopUIMode).toBe("compact");
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();
    expect(container.querySelector(".App-toolbar--compact")).not.toBeNull();
    expect(container.querySelector(".ToolIcon__penMode")).not.toBeNull();

    pointer.downAt(rectangle.x + rectangle.width / 2, rectangle.y);

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();

    pointer.moveTo(rectangle.x + rectangle.width / 2 + 20, rectangle.y + 20);

    expect(h.state.selectedElementsAreBeingDragged).toBe(true);
    expect(container.querySelector(stylesPanelSelector)).toBeNull();
    expect(container.querySelector(".App-toolbar--compact")).not.toBeNull();
    expect(container.querySelector(".ToolIcon__penMode")).not.toBeNull();

    pointer.upAt();

    expect(h.state.selectedElementsAreBeingDragged).toBe(false);
    expect(container.querySelector(stylesPanelSelector)).not.toBeNull();
  });
});
