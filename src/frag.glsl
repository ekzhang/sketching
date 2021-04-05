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
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;

vec4 sample(vec2 brightness, vec3 basepoint, vec2 curvature) {
    vec2 device = (gl_FragCoord.xy - basepoint.xy / basepoint.z) / resolution.y;
    vec2 dir = normalize(curvature);
    vec2 uv = vec2(dot(dir, device), -dir.y * device.x + dir.x * device.y);

    vec4 ret;
    vec2 texCoords = mod(0.5 + scale * uv, 1.0);
    int level = int(5.0 * min(brightness.x / brightness.y, 0.99));
    if (level == 0) {
		ret = texture2D(texture4, texCoords);
    } else if (level == 1) {
        ret = texture2D(texture3, texCoords);
    } else if (level == 2) {
        ret = texture2D(texture2, texCoords);
    } else if (level == 3) {
        ret = texture2D(texture1, texCoords);
    } else if (level == 4) {
        ret = texture2D(texture0, texCoords);
    }
    return ret;
}

void main() {
	vec4 textureA = sample(brightnessA, vCoordA, vCurvatureA) * brightnessA.y;
	vec4 textureB = sample(brightnessB, vCoordB, vCurvatureB) * brightnessB.y;
	vec4 textureC = sample(brightnessC, vCoordC, vCurvatureC) * brightnessC.y;

	gl_FragColor = textureA + textureB + textureC;
}
