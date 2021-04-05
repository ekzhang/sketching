precision mediump float;

varying vec2 vTexCoordA;
varying vec2 vTexCoordB;
varying vec2 vTexCoordC;
varying vec2 brightnessA; // a vector {brightness, 1}
varying vec2 brightnessB; // a vector {brightness, 1}
varying vec2 brightnessC; // a vector {brightness, 1}

uniform vec3 resolution;
uniform float scale;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;

vec4 sample(vec2 brightness, vec2 uv) {
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
	int brightness = int(5.0 * brightnessA.x/brightnessA.y);
	if (brightness == 5) {
		brightness = 4;
	}

	vec4 textureA = sample(brightnessA, vTexCoordA) * brightnessA.y;
	vec4 textureB = sample(brightnessB, vTexCoordB) * brightnessB.y;
	vec4 textureC = sample(brightnessC, vTexCoordC) * brightnessC.y;

	gl_FragColor = textureA + textureB + textureC;
}
