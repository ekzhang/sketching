precision mediump float;

uniform mat4 view, projection;

attribute vec3 position, normal;
attribute float indexInTriangle; // 0=A, 1=B, 2=C
attribute vec2 texCoordA;
attribute vec2 texCoordB;
attribute vec2 texCoordC;

varying vec2 vTexCoordA;
varying vec2 vTexCoordB;
varying vec2 vTexCoordC;
varying vec2 brightnessA; // a vector {brightness, 1}
varying vec2 brightnessB; // a vector {brightness, 1}
varying vec2 brightnessC; // a vector {brightness, 1}

void main() {
  	vec4 modelViewPosition = view * vec4(position, 1.0);

    // Gouraud shading at each vertex, using Lambertian BRDF
    vec3 light = vec3(0.0, 10.0, 10.0);
    vec3 light2 = vec3(10.0, 10.0, -10.0);
    vec3 light3 = vec3(-5.0, 2.0, 0.0);
    float diffuse = 0.0;
    diffuse += max(dot(normalize(light - position), normal), 0.0);
    diffuse += 0.8 * max(dot(normalize(light2 - position), normal), 0.0);
    diffuse += 0.5 * max(dot(normalize(light3 - position), normal), 0.0);

    vTexCoordA = texCoordA;
    vTexCoordB = texCoordB;
    vTexCoordC = texCoordC;
    brightnessA = (1.0 - step(0.5, abs(indexInTriangle - 0.0))) * vec2(diffuse, 1.0);
    brightnessB = (1.0 - step(0.5, abs(indexInTriangle - 1.0))) * vec2(diffuse, 1.0);
    brightnessC = (1.0 - step(0.5, abs(indexInTriangle - 2.0))) * vec2(diffuse, 1.0);
  	gl_Position = projection * modelViewPosition;
}
