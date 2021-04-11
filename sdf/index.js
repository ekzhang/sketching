import Regl from "regl";
import Tweakpane from "tweakpane";

import fragmentShader from "./frag.glsl?raw";
import fragmentShader2 from "./frag2.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import pencilTexturesUrl from "../textures/texture_256_64_64.png";
import { loadImage } from "../common/utils";

const regl = Regl({
  extensions: [
    "WEBGL_draw_buffers",
    "OES_texture_float",
    "OES_standard_derivatives",
  ],
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
    zoom: -1.0,
    height: 1.5,
    rotate: true,
    speed: 0.5,
    angle: 0,
    mode: 3,
  };

  pane.addInput(params, "scale", { min: 0, max: 50 });
  pane.addInput(params, "mode", {
    options: { shading: 3, curvature: 2, normal: 1 },
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
    eye: regl.prop("eye"),
    center: regl.prop("center"),
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
    numTextures: () => numTextures,
    pencilTextures: () => pencilTextures,
  },
});

initTextures().then(() => {
  regl.frame(({ viewportWidth, viewportHeight }) => {
    if (params.rotate) {
      params.angle = (params.angle + params.speed / 100.0) % (2 * Math.PI);
      pane.refresh();
    }
    const t = params.angle;
    const radius = Math.pow(2, -params.zoom);
    const height = params.height;

    const props = {
      eye: [radius * Math.cos(t), height, radius * Math.sin(t)],
      center: [0, 0, 0],
    };

    common(props, () => {
      fbo.resize(viewportWidth, viewportHeight);
      regl.clear({ framebuffer: fbo, color: [0, 0, 0, 0] });
      drawGeom();
      regl.clear({ color: [1, 1, 1, 1] });
      drawColor();
    });
  });
});
