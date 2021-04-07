import Regl from "regl";
import { mat4 } from "gl-matrix";
import Tweakpane from "tweakpane";

import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import bunny from "../models/bunny_1k_2_sub.json";
import { loadMesh } from "./geometry";
import { displayImageData, generatePencilTextures } from "./texture";

const pane = new Tweakpane({ title: "Parameters" });
const params = {
  scale: 15,
  zoom: 0.5,
  height: 0.2,
  rotate: true,
  speed: 0.5,
  angle: 0,
};
pane.addInput(params, "scale", { min: 0, max: 50 });
pane.addInput(params, "zoom", { min: -5, max: 5 });
pane.addInput(params, "height", { min: -1, max: 1 });
pane.addSeparator();
pane.addInput(params, "rotate");
pane.addInput(params, "speed", { min: -1.0, max: 1.0 });
pane.addInput(params, "angle", { min: 0, max: 2 * Math.PI });

const regl = Regl({ extensions: ["OES_standard_derivatives"] });

const numTextures = 64;
const imageData = generatePencilTextures(numTextures, 64, 64);
//displayImageData(imageData);

const pencilTextures = regl.texture({
  data: imageData.data,
  width: imageData.width,
  height: imageData.height,
  mag: "linear",
  min: "mipmap",
  mipmap: true,
});

const { elements, attributes } = loadMesh(bunny);

const draw = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes,
  elements,
  uniforms: {
    eye: regl.prop("eye"),
    view: (context, props) => {
      return mat4.lookAt([], props.eye, props.center, [0, 1, 0]);
    },
    projection: ({ viewportWidth, viewportHeight }) =>
      mat4.perspective(
        [],
        Math.PI / 4,
        viewportWidth / viewportHeight,
        0.01,
        1000
      ),
    resolution: (c) => [
      c.drawingBufferWidth,
      c.drawingBufferHeight,
      Math.min(c.drawingBufferWidth, c.drawingBufferHeight),
    ],
    pixelRatio: regl.context("pixelRatio"),
    scale: () => params.scale, // How large the textures are scaled in world space
    numTextures: () => 1.0 * numTextures,
    pencilTextures: () => pencilTextures,
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

  regl.clear({
    color: [1, 1, 1, 1],
  });
  draw({
    eye: [radius * Math.cos(t), height, radius * Math.sin(t)],
    center: [0, height, 0],
  });
});
