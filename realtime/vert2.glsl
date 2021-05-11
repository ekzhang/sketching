#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_draw_buffers : require
precision mediump float;

varying vec3 vPosition, vNormal;

uniform mat4 view, projection;
uniform vec3 resolution;
uniform vec3 eye;

attribute vec3 position, normal;

void main() {
    vPosition = position;
    vNormal = normal;
  	vec4 modelViewPosition = view * vec4(position, 1.0);
  	gl_Position = projection * modelViewPosition;
}