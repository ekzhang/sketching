precision mediump float;

uniform vec3 resolution;
uniform vec3 eye;
uniform vec3 center;
uniform sampler2D normalTex;
uniform sampler2D curvTex;
uniform sampler2D colorTex;
uniform int cmode;
uniform float scale;
uniform float numTextures;
uniform sampler2D pencilTextures;

const float w = 20.0;

vec3 calc(vec2 coord) {
    // Texture coordinates
    vec2 tp = coord / resolution.xy;
    vec4 color4 = texture2D(colorTex, tp);
    if (color4.w == 0.0) {
        return vec3(0.0);
    }
    float color = color4.x;
    vec2 ssc = texture2D(curvTex, tp).xy;
    ssc *= sign(ssc.x); // reduces jitteriness

    vec2 device = (gl_FragCoord.xy - coord) / resolution.y;
    vec2 uv = vec2(dot(ssc, device), -ssc.y * device.x + ssc.x * device.y);
    vec2 texCoords = fract(0.5 + scale * uv);
    float level = numTextures - 1.0 - floor(numTextures * color);
    texCoords.y = (level + texCoords.y) / numTextures;

    // Returns: {texture, color, 1.0}
    return vec3(texture2D(pencilTextures, texCoords).x, color, 1.0);
}

void main() {
    // Texture coordinates
    vec2 tp = gl_FragCoord.xy / resolution.xy;

    if (cmode == 1) {
        vec3 normal = texture2D(normalTex, tp).xyz;
        gl_FragColor = vec4(0.5 + 0.5 * normal, 1.0);
    } else if (cmode == 2) {
        vec2 curv = texture2D(curvTex, tp).xy;
        gl_FragColor = vec4(abs(curv), 0.0, 1.0);
    } else if (cmode == 3) {
        vec4 color4 = texture2D(colorTex, tp);
        if (color4.w == 0.0) {
            return; // this is a background pixel
        }

        vec2 p0 = gl_FragCoord.xy - mod(gl_FragCoord.xy, w);
        vec2 f = (gl_FragCoord.xy - p0) / w;

        vec3 data = vec3(0.0);
        data += (1.0 - f.x) * (1.0 - f.y) * calc(p0);
        data += f.x * (1.0 - f.y) * calc(p0 + vec2(w, 0));
        data += (1.0 - f.x) * f.y * calc(p0 + vec2(0, w));
        data += f.x * f.y * calc(p0 + vec2(w, w));
        data /= data.z;

        // Adjust darkness to match actual Phong-interpolated color
        float color = data.x * (color4.x / data.y);
        gl_FragColor = vec4(vec3(color), 1.0);
    }
}
