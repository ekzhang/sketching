varying vec2 vUv;

varying vec2 vTexCoordA;
varying vec2 vTexCoordB;
varying vec2 vTexCoordC;

varying vec2 brightnessA; // a vector {brightness, 1}
varying vec2 brightnessB; // a vector {brightness, 1}
varying vec2 brightnessC; // a vector {brightness, 1}

uniform sampler2D textures[5];

void main() {
	highp int brightness = int(5.0 * brightnessA.x/brightnessA.y);
	if(brightness == 5){
		brightness = 4;
	}

	vec4 textureA;// = texture2D(textures[4-brightness], vUv);
	switch(brightness){
		case 0:
			textureA = texture2D(textures[4], vUv);
			break;
		case 1:
			textureA = texture2D(textures[3], vUv);
			break;
		case 2:
			textureA = texture2D(textures[2], vUv);
			break;
		case 3:
			textureA = texture2D(textures[1], vUv);
			break;
		case 4:
			textureA = texture2D(textures[0], vUv);
			break;
	}

	// gl_FragColor = vec4(vec3(brightnessA.x), 1.0);
	gl_FragColor = textureA;
	// gl_FragColor = vec4(vUv, 0.0, 0.0);
}
