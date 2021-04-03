varying vec2 vUv;

attribute vec2 texCoordA;
attribute vec2 texCoordB;
attribute vec2 texCoordC;

varying vec2 vTexCoordA;
varying vec2 vTexCoordB;
varying vec2 vTexCoordC;

attribute uint indexInTriangle; // 0=A, 1=B, 2=C

varying vec2 brightnessA; // a vector {brightness, 1}
varying vec2 brightnessB; // a vector {brightness, 1}
varying vec2 brightnessC; // a vector {brightness, 1}

void main() {
	vUv = uv;
  	vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
	brightnessA.x = min(pow(max(0.5 * modelViewPosition.y + 0.5, 0.0), 1.4), 1.0);
	brightnessA.y = 1.0;
  	gl_Position = projectionMatrix * modelViewPosition;
}
