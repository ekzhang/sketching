import Regl from "regl";
import { mat4 } from "gl-matrix";
import Tweakpane from "tweakpane";

import { loadMesh } from "../common/geometry";
import { generatePencilTextures } from "../common/texture";
import { saveImage, loadImage } from "../common/utils";
import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import pencilTexturesUrl from "../textures/texture_256_64_64.png";
import bunnyLargeUrl from "../models/bunny_1k_2_sub.json?url";
import bunnySmallUrl from "../models/bunny_1k.json?url";

const meshes = {
  "Bunny Large": bunnyLargeUrl,
  "Bunny Small": bunnySmallUrl,
};

const regl = Regl({ extensions: ["OES_standard_derivatives"] });
const [pane, params] = initPane();

let numTextures, pencilTextures, attributes, elements;

function initPane() {
  const pane = new Tweakpane({ title: "Parameters" });
  const params = {
    scale: 15,
    mesh: bunnyLargeUrl,
    zoom: 0.8,
    height: 0.2,
    rotate: true,
    speed: 0.5,
    angle: 0,
  };

  pane.addInput(params, "scale", { min: 0, max: 50 });
  pane.addInput(params, "mesh", { options: meshes }).on("change", updateMesh);

  const camera = pane.addFolder({ title: "Camera" });
  camera.addInput(params, "zoom", { min: -5, max: 5 });
  camera.addInput(params, "height", { min: -1, max: 1 });
  camera.addSeparator();
  camera.addInput(params, "rotate");
  camera.addInput(params, "speed", { min: -1.0, max: 1.0 });
  camera.addInput(params, "angle", { min: 0, max: 2 * Math.PI });

  const textures = pane.addFolder({ title: "Textures" });
  const texParams = {
    number: 64,
    logsize: 6,
    save: false,
  };
  textures.addInput(texParams, "number", { min: 8, max: 256, step: 8 });
  textures.addInput(texParams, "logsize", { min: 4, max: 7, step: 1 });
  textures.addInput(texParams, "save");
  textures.addButton({ title: "Generate" }).on("click", () => {
    generateTextures(texParams);
  });

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

function generateTextures(texParams) {
  const size = Math.pow(2, texParams.logsize);
  const img = generatePencilTextures(texParams.number, size, size);
  const textures = regl.texture({
    data: img.data,
    width: size,
    height: size * texParams.number,
    mag: "linear",
    min: "mipmap",
    mipmap: true,
  });
  if (texParams.save) {
    saveImage("textures.png", img);
  }
  numTextures = texParams.number;
  pencilTextures = textures;
}

async function updateMesh() {
  const resp = await fetch(params.mesh);
  const mesh = await resp.json();
  const data = loadMesh(mesh);
  attributes = data.attributes;
  elements = data.elements;
}

const draw = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes: {
    position: () => attributes.position,
    normal: () => attributes.normal,
    indexInTriangle: () => attributes.indexInTriangle,
    curvature: () => attributes.curvature,
  },
  elements: () => elements,
  uniforms: {
    eye: regl.prop("eye"),
    view: (_, props) => {
      return mat4.lookAt([], props.eye, props.center, [0, 1, 0]);
    },
    projection: ({ viewportWidth, viewportHeight }) => {
      const ratio = viewportWidth / viewportHeight;
      return mat4.perspective([], Math.PI / 4, ratio, 0.01, 1000);
    },
    resolution: ({ drawingBufferWidth, drawingBufferHeight }) => [
      drawingBufferWidth,
      drawingBufferHeight,
      Math.min(drawingBufferWidth, drawingBufferHeight),
    ],
    pixelRatio: regl.context("pixelRatio"),
    scale: () => params.scale, // How large the textures are scaled in world space
    numTextures: () => numTextures,
    pencilTextures: () => pencilTextures,
  },
  cull: {
    enable: true,
  },
});

Promise.all([initTextures(), updateMesh()]).then(() => {
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
      center: [0, height, 0],
    });
  });
});
