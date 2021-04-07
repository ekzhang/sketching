import Regl from "regl";
import { mat4 } from "gl-matrix";
import Tweakpane from "tweakpane";

import { loadMesh } from "./geometry";
import { generatePencilTextures } from "./texture";
import { saveImage, loadImage } from "./utils";
import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import pencilTexturesUrl from "../textures/texture_256_64_64.png";
import bunnyLargeUrl from "../models/bunny_1k_2_sub.json?url";
import bunnySmallUrl from "../models/bunny_1k.json?url";

const regl = Regl({ extensions: ["OES_standard_derivatives"] });

const meshes = {
  "Bunny Large": bunnyLargeUrl,
  "Bunny Small": bunnySmallUrl,
};

class Renderer {
  async start() {
    this.initPane();
    await Promise.all([this.initTextures(), this.loadMesh()]);

    regl.frame(() => {
      if (this.params.rotate) {
        this.params.angle =
          (this.params.angle + this.params.speed / 100.0) % (2 * Math.PI);
        this.pane.refresh();
      }
      const t = this.params.angle;
      const radius = Math.pow(2, -this.params.zoom);
      const height = this.params.height;

      regl.clear({ color: [1, 1, 1, 1] });
      this.draw({
        eye: [radius * Math.cos(t), height, radius * Math.sin(t)],
        center: [0, height, 0],
      });
    });
  }

  initPane() {
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
    pane.addInput(params, "mesh", { options: meshes }).on("change", () => {
      this.loadMesh();
    });

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
      width: 64,
      height: 64,
      save: false,
    };
    textures.addInput(texParams, "number", { min: 8, max: 256, step: 8 });
    textures.addInput(texParams, "width", { min: 16, max: 128, step: 8 });
    textures.addInput(texParams, "height", { min: 16, max: 128, step: 8 });
    textures.addInput(texParams, "save");
    textures.addButton({ title: "Generate" }).on("click", () => {
      this.generateTextures(texParams);
    });

    this.pane = pane;
    this.params = params;
  }

  async initTextures() {
    const textures = regl.texture({
      data: await loadImage(pencilTexturesUrl),
      mag: "linear",
      min: "mipmap",
      mipmap: true,
    });
    this.setTextures(256, textures);
  }

  setTextures(numTextures, pencilTextures) {
    this.numTextures = numTextures;
    this.pencilTextures = pencilTextures;
  }

  generateTextures(texParams) {
    const img = generatePencilTextures(
      texParams.number,
      texParams.width,
      texParams.height
    );
    const textures = regl.texture({
      data: img.data,
      width: texParams.width,
      height: texParams.height * texParams.number,
      mag: "linear",
      min: "mipmap",
      mipmap: true,
    });
    if (texParams.save) {
      saveImage("textures.png", img);
    }
    this.setTextures(texParams.number, textures);
  }

  async loadMesh() {
    const resp = await fetch(this.params.mesh);
    const mesh = await resp.json();
    const { attributes, elements } = loadMesh(mesh);
    this.attributes = attributes;
    this.elements = elements;
  }
}

Renderer.prototype.draw = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes: {
    position: regl.this("attributes.position"),
    normal: regl.this("attributes.normal"),
    indexInTriangle: regl.this("attributes.indexInTriangle"),
    curvature: regl.this("attributes.curvature"),
  },
  elements: regl.this("elements"),
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
    scale: regl.this("params.scale"), // How large the textures are scaled in world space
    numTextures: regl.this("numTextures"),
    pencilTextures: regl.this("pencilTextures"),
  },
  cull: {
    enable: true,
  },
});

new Renderer().start();
