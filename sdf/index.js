import Regl from "regl";
import Tweakpane from "tweakpane";

import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";

const regl = Regl({ extensions: ["OES_standard_derivatives"] });
const [pane, params] = initPane();

function initPane() {
  const pane = new Tweakpane({ title: "Parameters" });
  const params = {
    scale: 15,
    zoom: -1.0,
    height: 1.5,
    rotate: true,
    speed: 0.5,
    angle: 0,
    mode: "curvature",
  };

  pane.addInput(params, "scale", { min: 0, max: 50 });
  pane.addInput(params, "mode", {
    options: { curvature: "curvature", normal: "normal" },
  });

  const camera = pane.addFolder({ title: "Camera" });
  camera.addInput(params, "zoom", { min: -5, max: 5 });
  camera.addInput(params, "height", { min: -10, max: 10 });
  camera.addSeparator();
  camera.addInput(params, "rotate");
  camera.addInput(params, "speed", { min: -1.0, max: 1.0 });
  camera.addInput(params, "angle", { min: 0, max: 2 * Math.PI });

  return [pane, params];
}

const draw = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes: {
    position: [
      [-1, 1],
      [-1, -1],
      [1, 1],
      [1, -1],
    ],
  },
  elements: [
    [0, 1, 2],
    [2, 1, 3],
  ],
  uniforms: {
    eye: regl.prop("eye"),
    center: regl.prop("center"),
    resolution: ({ drawingBufferWidth, drawingBufferHeight }) => [
      drawingBufferWidth,
      drawingBufferHeight,
      Math.min(drawingBufferWidth, drawingBufferHeight),
    ],
    scale: () => params.scale, // How large the textures are scaled in world space
    cmode: () => params.mode === "curvature",
  },
});

regl.frame(() => {
  if (params.rotate) {
    params.angle = (params.angle + params.speed / 100.0) % (2 * Math.PI);
    pane.refresh();
  }
  const t = params.angle;
  const radius = Math.pow(2, -params.zoom);
  const height = params.height;

  regl.clear({ color: [1, 1, 1, 1] });
  draw({
    eye: [radius * Math.cos(t), height, radius * Math.sin(t)],
    center: [0, 0, 0],
  });
});
