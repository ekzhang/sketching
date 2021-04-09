precision mediump float;

uniform mat4 view, projection;
uniform vec3 resolution;

attribute vec3 position, normal, curvature;
attribute float indexInTriangle; // 0=A, 1=B, 2=C

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

vec2 screenspace(vec3 dir) {
    vec4 mvp = projection * view * vec4(position, 1.0);
    vec4 mvp2 = projection * view * vec4(position + dir, 1.0);
    return (mvp2.xy / mvp2.w) - (mvp.xy / mvp.w);
}

void main() {
    vPosition = position;
    vNormal = normal;
  	vec4 modelViewPosition = view * vec4(position, 1.0);
  	gl_Position = projection * modelViewPosition;

    // Gouraud shading at each vertex, using Lambertian BRDF
    vec3 light = vec3(0.0, 10.0, 10.0);
    vec3 light2 = vec3(10.0, 10.0, -10.0);
    vec3 light3 = vec3(-5.0, 2.0, 0.0);
    float diffuse = 0.0;
    diffuse += max(dot(normalize(light - position), normal), 0.0);
    diffuse += 0.8 * max(dot(normalize(light2 - position), normal), 0.0);
    diffuse += 0.5 * max(dot(normalize(light3 - position), normal), 0.0);
    diffuse *= 0.75;

    float isA = 1.0 - step(0.5, abs(indexInTriangle - 0.0));
    float isB = 1.0 - step(0.5, abs(indexInTriangle - 1.0));
    float isC = 1.0 - step(0.5, abs(indexInTriangle - 2.0));

    // Interpolated lighting
    brightnessA = isA * vec2(diffuse, 1.0);
    brightnessB = isB * vec2(diffuse, 1.0);
    brightnessC = isC * vec2(diffuse, 1.0);

    // Screen-space curvature directions
    vec2 ssCurvature = screenspace(curvature);
    vCurvatureA = isA * ssCurvature;
    vCurvatureB = isB * ssCurvature;
    vCurvatureC = isC * ssCurvature;

    // Screen-space coordinates
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 ssc = (ndc * 0.5 + 0.5) * resolution.xy;
    vCoordA = isA * vec3(ssc, 1.0);
    vCoordB = isB * vec3(ssc, 1.0);
    vCoordC = isC * vec3(ssc, 1.0);
}
