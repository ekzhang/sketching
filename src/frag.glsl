precision mediump float;

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
uniform float scale;
uniform sampler2D pencilTextures;

vec4 sample(vec2 brightness, vec3 basepoint, vec2 curvature) {
    vec2 device = (gl_FragCoord.xy - basepoint.xy / basepoint.z) / resolution.y;
    vec2 dir = normalize(curvature);
    vec2 uv = vec2(dot(dir, device), -dir.y * device.x + dir.x * device.y);

    vec2 texCoords = mod(0.5 + scale * uv, 1.0);
    float level = 15.0 - floor(16.0 * brightness.x / brightness.y);
    texCoords.y = (level + texCoords.y) / 16.0;
    return texture2D(pencilTextures, texCoords);
}

void main() {
	vec4 textureA = sample(brightnessA, vCoordA, vCurvatureA) * brightnessA.y;
	vec4 textureB = sample(brightnessB, vCoordB, vCurvatureB) * brightnessB.y;
	vec4 textureC = sample(brightnessC, vCoordC, vCurvatureC) * brightnessC.y;

	gl_FragColor = textureA + textureB + textureC;
}
