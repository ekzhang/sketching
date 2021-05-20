import Regl from "regl";
import { mat4 } from "gl-matrix";
import Tweakpane from "tweakpane";

import { loadMesh } from "../common/geometry";
import { generatePencilTextures } from "../common/texture";
import { saveImage, loadImage } from "../common/utils";
import createCamera from "../common/camera";
import fragmentShaderA from "./frag.glsl?raw";
import fragmentShaderB from "./frag2.glsl?raw";
import fragmentShaderC from "./frag3.glsl?raw";
import vertexShaderA from "./vert.glsl?raw";
import vertexShaderB from "./vert2.glsl?raw";
import vertexShaderC from "./vert3.glsl?raw";
import pencilTexturesUrl from "../textures/texture_256_64_64.png";
import bunnyLargeUrl from "../models/bunny_1k_2_sub.json?url";
import bunnySmallUrl from "../models/bunny_1k.json?url";
import teapotUrl from "../models/clean_teapot.json?url";
import armadilloUrl from "../models/armadillo.json?url";
import csgUrl from "../models/clean_csg.json?url";
import torusUrl from "../models/torus.json?url";
import { Cloth } from "./cloth.js";

const meshes = {
  "Cloth": "Cloth",
  "Bunny Large": bunnyLargeUrl,
  "Bunny Small": bunnySmallUrl,
  "Utah Teapot": teapotUrl,
  Armadillo: armadilloUrl,
  CSG: csgUrl,
  Torus: torusUrl,
};

const regl = Regl({
  extensions: [
    "WEBGL_draw_buffers",
    "OES_texture_float",
    "OES_texture_float_linear",
    "OES_standard_derivatives",
  ],
});

const camera = createCamera(document.getElementsByTagName("canvas")[0], {
  eye: [1.7, 1.5, 2.9],
  center: [0, 0, 0],
});

const [pane, params] = initPane();

let numTextures, pencilTextures, attributes, elements;
let cloth = null;

function initPane() {
  const pane = new Tweakpane({ title: "Parameters" });
  const params = {
    scale: 15,
    mesh: "Cloth",
    zoom: 0.8,
    height: 0.2,
    rotate: true,
    speed: 0.5,
    angle: 0,
  };

  pane.addInput(params, "scale", { min: 0, max: 50 });
  pane.addInput(params, "mesh", { options: meshes }).on("change", updateMesh);

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
  if (params.mesh === "Cloth") {
    if (cloth === null) {
        cloth = new Cloth(25, 50);
    }
    const data = cloth.step();
    attributes = data.attributes;
    elements = data.elements;
  }
  else {
    const resp = await fetch(params.mesh);
    const mesh = await resp.json();
    const data = loadMesh(mesh);
    attributes = data.attributes;
    elements = data.elements;
  }
}

const common = regl({
  attributes: {
    position: () => attributes.position,
    normal: () => attributes.normal,
    indexInTriangle: () => attributes.indexInTriangle,
    //curvature: () => attributes.curvature,
  },
  elements: () => elements,
  uniforms: {
    eye: regl.prop("eye"),
    view: (_, props) => {
      return mat4.lookAt([], props.eye, props.center, [0, 1, 0]);
    },
    projection: ({ viewportWidth, viewportHeight }) => {
      const ratio = viewportWidth / viewportHeight;
      return mat4.perspective([], Math.PI / 5, ratio, 0.01, 1000);
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
});

const fboA = regl.framebuffer({
  color: [
    regl.texture({ type: "float" }),
    regl.texture({ type: "float" }),
  ],
  depth: true,
});

const fboB = regl.framebuffer({
  color: [
    regl.texture({
      type: "float",
      mag: "linear",
      min: "linear",
      mipmap: false,
    }),
  ],
  depth: true,
});

const drawA = regl({
  frag: fragmentShaderA,
  vert: vertexShaderA,
  framebuffer: fboA,
});

const drawB = regl({
  frag: fragmentShaderB,
  vert: vertexShaderB,
  framebuffer: fboB,
  uniforms: {
    normalTex: fboA.color[0],
    positionTex: fboA.color[1],
  }
});

const drawC = regl({
  frag: fragmentShaderC,
  vert: vertexShaderC,
  uniforms: {
    directionTex: fboB.color[0],
  }
});

Promise.all([initTextures(), updateMesh()]).then(() => {
  regl.frame(({ viewportWidth, viewportHeight }) => {
    common({
      eye: camera.eye,
      center: camera.center,
    },
    () => {
      if (params.mesh === "Cloth") {
        updateMesh();
      }
      fboA.resize(viewportWidth, viewportHeight);
      fboB.resize(viewportWidth, viewportHeight);
      regl.clear({ framebuffer: fboA, color: [0, 0, 0, 0], depth: 1000.0 });
      regl.clear({ framebuffer: fboB, color: [0, 0, 0, 0], depth: 1000.0 });
      regl.clear({ color: [1, 1, 1, 1] });
      drawA();
      drawB();
      drawC();
    });
  });
});
