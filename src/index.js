import Regl from "regl";
import resl from "resl";
import { mat4 } from "gl-matrix";
import Tweakpane from "tweakpane";

import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import texture0 from "../textures/texture0.png";
import texture1 from "../textures/texture1.png";
import texture2 from "../textures/texture2.png";
import texture3 from "../textures/texture3.png";
import texture4 from "../textures/texture4.png";
import bunny from "../models/bunny_1k.json";
import { loadMesh } from "./geometry";

const pane = new Tweakpane({ title: "Parameters" });
const params = {
  scale: 15,
  zoom: 0.5,
  height: 0.2,
  rotate: true,
  angle: 0,
};
pane.addInput(params, "scale", { min: 5, max: 25 });
pane.addInput(params, "zoom", { min: -5, max: 5 });
pane.addInput(params, "height", { min: -1, max: 1 });
pane.addSeparator();
pane.addInput(params, "rotate");
pane.addInput(params, "angle", { min: 0, max: 2 * Math.PI });

const regl = Regl();

const { elements, attributes } = loadMesh(bunny);

const draw = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes,
  elements,
  uniforms: {
    view: () => {
      if (params.rotate) {
        params.angle = (params.angle + 0.01) % (2 * Math.PI);
        pane.refresh();
      }
      const t = params.angle;
      const radius = Math.pow(2, -params.zoom);
      const height = params.height;
      return mat4.lookAt(
        [],
        [radius * Math.cos(t), height, radius * Math.sin(t)],
        [0, height, 0],
        [0, 1, 0]
      );
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
    scale: () => params.scale, // How large the textures are scaled in world space
    texture0: regl.prop("texture0"),
    texture1: regl.prop("texture1"),
    texture2: regl.prop("texture2"),
    texture3: regl.prop("texture3"),
    texture4: regl.prop("texture4"),
  },
});

const textureParser = (data) =>
  regl.texture({
    data,
    mag: "linear",
    min: "linear",
  });

resl({
  manifest: {
    texture0: { type: "image", src: texture0, parser: textureParser },
    texture1: { type: "image", src: texture1, parser: textureParser },
    texture2: { type: "image", src: texture2, parser: textureParser },
    texture3: { type: "image", src: texture3, parser: textureParser },
    texture4: { type: "image", src: texture4, parser: textureParser },
  },
  onDone: (assets) => {
    regl.frame(() => {
      regl.clear({
        color: [0.98, 0.98, 0.98, 1],
      });
      draw(assets);
    });
  },
});
