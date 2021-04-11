#extension GL_OES_standard_derivatives : enable
precision mediump float;

varying vec3 vPosition, vNormal;
varying vec2 brightnessA;
varying vec2 brightnessB;
varying vec2 brightnessC;
varying vec2 vCurvatureA;
varying vec2 vCurvatureB;
varying vec2 vCurvatureC;
varying vec3 vCoordA;
varying vec3 vCoordB;
varying vec3 vCoordC;

uniform vec3 resolution;
uniform float pixelRatio;
uniform float scale;
uniform float numTextures;
uniform sampler2D pencilTextures;
uniform vec3 eye;

vec4 sample(vec2 brightness, vec3 basepoint, vec2 curvature) {
    vec2 device = (gl_FragCoord.xy - basepoint.xy / basepoint.z) / resolution.y;
    vec2 dir = normalize(curvature);
    vec2 uv = vec2(dot(dir, device), -dir.y * device.x + dir.x * device.y);

    vec2 texCoords = fract(0.5 + scale * uv);
    float level = numTextures - 1.0 - floor(numTextures * brightness.x / brightness.y);
    texCoords.y = (level + texCoords.y) / numTextures;
    return texture2D(pencilTextures, texCoords);
}

void main() {
	vec4 textureA = sample(brightnessA, vCoordA, vCurvatureA) * brightnessA.y;
	vec4 textureB = sample(brightnessB, vCoordB, vCurvatureB) * brightnessB.y;
	vec4 textureC = sample(brightnessC, vCoordC, vCurvatureC) * brightnessC.y;

	vec3 baseColor = (textureA + textureB + textureC).xyz;
    float vDotN = abs(dot(normalize(vNormal), normalize(vPosition - eye)));
    float vDotNGrad = fwidth(vDotN);
    float cartoonEdge = smoothstep(0.75, 1.25, vDotN / vDotNGrad / 3.0 / pixelRatio);
    gl_FragColor = vec4(mix(vec3(0.3), baseColor, cartoonEdge), 1.0);
}
