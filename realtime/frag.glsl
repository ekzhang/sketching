#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_draw_buffers : require
precision mediump float;

varying vec3 vPosition, vNormal;

void main() {
    gl_FragData[0] = vec4(vNormal, 1.0);
    gl_FragData[1] = vec4(vPosition, 1.0);
}
