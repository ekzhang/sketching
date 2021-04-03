import "./styles.css";

import fragmentShader from "./frag.glsl?raw";
import vertexShader from "./vert.glsl?raw";
import texture0 from "./textures/texture0.png";
import texture1 from "./textures/texture1.png";
import texture2 from "./textures/texture2.png";
import texture3 from "./textures/texture3.png";
import texture4 from "./textures/texture4.png";

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  ShaderMaterial,
  Mesh,
  UniformsUtils,
  ShaderLib,
  AmbientLight,
  PointLight,
  TextureLoader,
} from "three";

const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new BoxGeometry();
//const uniforms = UniformsUtils.merge([ShaderLib.phong.uniforms]);
const textureLoader = new TextureLoader();

const uniforms = {
  textures: {
    value: [
      textureLoader.load(texture0),
      textureLoader.load(texture1),
      textureLoader.load(texture2),
      textureLoader.load(texture3),
      textureLoader.load(texture4),
    ],
  },
};

// var ambientLight = new AmbientLight(0xffffff, 0.2);
// scene.add(ambientLight);

// var pointLight = new PointLight(0xffffff, 1, 100);
// pointLight.position.set(3, 3, 3);
// scene.add(pointLight);

const material = new ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  // lights: true,
});
const cube = new Mesh(geometry, material);
scene.add(cube);

camera.position.z = 2;

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.02;
  cube.rotation.y += 0.02;
  renderer.render(scene, camera);
}
animate();
