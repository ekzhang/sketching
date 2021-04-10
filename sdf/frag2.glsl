precision mediump float;

uniform vec3 resolution;
uniform vec3 eye;
uniform vec3 center;
uniform sampler2D normalTex;
uniform sampler2D curvTex;
uniform int cmode;

void main() {
    // Pixel coordinates, normalized so that p.y in range [-1, 1]
    vec2 p = (2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y;

    // View ray from camera
    vec3 ww = normalize(center - eye);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 dir = normalize(p.x * uu + p.y * vv + 1.5 * ww);

    // Texture coordinates
    vec2 tp = gl_FragCoord.xy / resolution.xy;
    vec3 normal = texture2D(normalTex, tp).xyz;
    vec3 curv = texture2D(curvTex, tp).xyz;

    if (length(normal) > 0.0) {
        if (cmode == 1) {
            gl_FragColor = vec4(normal, 1.0);
        } else if (cmode == 2) {
            gl_FragColor = vec4(abs(curv), 1.0);
        }
    }
}
