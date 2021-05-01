import Regl from "regl";
import Tweakpane from "tweakpane";

import fragmentShader from "./frag.glsl?raw";
import fragmentShader2 from "./frag2.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import pencilTexturesUrl from "../textures/texture_256_64_64.png";
import { loadImage } from "../common/utils";
import createCamera from "../common/camera";

const regl = Regl({
  extensions: [
    "WEBGL_draw_buffers",
    "OES_texture_float",
    "OES_standard_derivatives",
  ],
});

const camera = createCamera(document.getElementsByTagName("canvas")[0], {
  eye: [1.7, 1.5, 2.9],
  center: [0, 0, 0],
});

const fbo = regl.framebuffer({
  color: [
    regl.texture({ type: "float" }),
    regl.texture({ type: "float" }),
    regl.texture({ type: "float" }),
  ],
  depth: false, // Don't need a depth buffer because flat square
});

const [pane, params] = initPane();

let numTextures, pencilTextures;

function initPane() {
  const pane = new Tweakpane({ title: "Parameters" });
  const params = {
    scale: 15,
    grid: 20,
    example: 2,
    mode: 3,
    fps: "---",
  };

  pane.addInput(params, "scale", { min: 0, max: 50 });
  pane.addInput(params, "grid", { min: 5, max: 40, step: 1 });
  pane.addInput(params, "example", { options: { torus: 1, csg: 2 } });
  pane.addInput(params, "mode", {
    options: { shading: 3, curvature: 2, normal: 1 },
  });
  pane.addMonitor(params, "fps");

  return [pane, params];
}

async function initTextures() {
  const textures = regl.texture({
    data: await loadImage(pencilTexturesUrl),
    mag: "linear",
    min: "mipmap",
    mipmap: true,
  });
  numTextures = 256;
  pencilTextures = textures;
}

const common = regl({
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
    eye: () => camera.eye,
    center: () => camera.center,
    resolution: ({ drawingBufferWidth, drawingBufferHeight }) => [
      drawingBufferWidth,
      drawingBufferHeight,
      Math.min(drawingBufferWidth, drawingBufferHeight),
    ],
    pixelRatio: regl.context("pixelRatio"),
  },
});

const drawGeom = regl({
  frag: fragmentShader,
  vert: vertexShader,
  framebuffer: fbo,
  uniforms: {
    example: () => params.example,
  },
});

const drawColor = regl({
  frag: fragmentShader2,
  vert: vertexShader,
  uniforms: {
    normalTex: fbo.color[0],
    curvTex: fbo.color[1],
    colorTex: fbo.color[2],
    cmode: () => params.mode,
    scale: () => params.scale,
    grid: () => params.grid,
    numTextures: () => numTextures,
    pencilTextures: () => pencilTextures,
  },
});

initTextures().then(() => {
  const frameTimes = [...Array(60)].fill(0);
  regl.frame(({ viewportWidth, viewportHeight }) => {
    const lastTime = frameTimes.shift();
    const time = performance.now();
    frameTimes.push(time);
    if (lastTime !== 0) {
      params.fps = (1000 / ((time - lastTime) / frameTimes.length)).toFixed(2);
    }
    common(() => {
      fbo.resize(viewportWidth, viewportHeight);
      regl.clear({ framebuffer: fbo, color: [0, 0, 0, 0] });
      drawGeom();
      regl.clear({ color: [1, 1, 1, 1] });
      drawColor();
    });
  });
});
