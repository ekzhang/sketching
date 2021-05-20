#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_draw_buffers : require
precision mediump float;

uniform mat4 view, projection;
uniform vec3 resolution;
uniform vec3 eye;

attribute vec3 position, normal;
attribute float indexInTriangle; // 0=A, 1=B, 2=C

varying vec3 vPosition, vNormal;


void main() {
    vPosition = position;
    vNormal = normal;
  	vec4 modelViewPosition = view * vec4(position, 1.0);
  	gl_Position = projection * modelViewPosition;
}
