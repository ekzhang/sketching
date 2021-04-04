precision mediump float;

varying vec2 vTexCoordA;
varying vec2 vTexCoordB;
varying vec2 vTexCoordC;
varying vec2 brightnessA; // a vector {brightness, 1}
varying vec2 brightnessB; // a vector {brightness, 1}
varying vec2 brightnessC; // a vector {brightness, 1}

uniform vec3 resolution;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;

void main() {
	highp int brightness = int(5.0 * brightnessA.x/brightnessA.y);
	if (brightness == 5) {
		brightness = 4;
	}

	vec4 textureA;// = texture2D(textures[4-brightness], vUv);
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.z; // screen coordinates in [-0.5, 0.5]
	if (brightness == 0) {
		textureA = texture2D(texture4, uv);
    } else if (brightness == 1) {
        textureA = texture2D(texture3, uv);
    } else if (brightness == 2) {
        textureA = texture2D(texture2, uv);
    } else if (brightness == 3) {
        textureA = texture2D(texture1, uv);
    } else if (brightness == 4) {
        textureA = texture2D(texture0, uv);
    }

	gl_FragColor = vec4(vec3(brightnessA.x), 1.0);

    // this looks kind of wacky but shows that textures are working
	// gl_FragColor = textureA;
}
