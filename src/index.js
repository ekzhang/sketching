import Regl from "regl";
import resl from "resl";
import mat4 from "gl-mat4";
import bunny from "bunny";
import normals from "angle-normals";

import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import texture0 from "./textures/texture0.png";
import texture1 from "./textures/texture1.png";
import texture2 from "./textures/texture2.png";
import texture3 from "./textures/texture3.png";
import texture4 from "./textures/texture4.png";

const regl = Regl();

const drawBunny = regl({
  frag: fragmentShader,
  vert: vertexShader,
  attributes: {
    position: bunny.positions,
    normal: normals(bunny.cells, bunny.positions),
  },
  elements: bunny.cells,
  uniforms: {
    view: ({ tick }) => {
      const t = 0.01 * tick;
      return mat4.lookAt(
        [],
        [30 * Math.cos(t), 2.5, 30 * Math.sin(t)],
        [0, 2.5, 0],
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
    texture0: {
      type: "image",
      src: texture0,
      parser: textureParser,
    },
    texture1: {
      type: "image",
      src: texture1,
      parser: textureParser,
    },
    texture2: {
      type: "image",
      src: texture2,
      parser: textureParser,
    },
    texture3: {
      type: "image",
      src: texture3,
      parser: textureParser,
    },
    texture4: {
      type: "image",
      src: texture4,
      parser: textureParser,
    },
  },
  onDone: (assets) => {
    regl.frame(() => {
      regl.clear({
        color: [0, 0, 0, 1],
      });
      drawBunny(assets);
    });
  },
});
