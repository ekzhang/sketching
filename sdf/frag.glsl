#extension GL_OES_standard_derivatives : enable
precision mediump float;

uniform vec3 resolution;
uniform vec3 eye;
uniform vec3 center;
uniform bool cmode;

// -- Begin primitive SDFs from
// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm

float sdSphere(vec3 p, float s) {
    return length(p)-s;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
}

// End primitive SDFs --

float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float map(vec3 pos) {
    float torus = sdTorus(pos, vec2(1.0, 0.15));
    float sphere = sdSphere(pos - vec3(1.0, 0.0, 0.0), 0.2);
    return opSmoothUnion(torus, sphere, 0.4);
}

// http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
vec3 calcNormal(vec3 pos) {
    vec2 e = vec2(1.0,-1.0)*0.5773;
    const float eps = 0.0005;
    return normalize( e.xyy*map( pos + e.xyy*eps ) +
					  e.yyx*map( pos + e.yyx*eps ) +
					  e.yxy*map( pos + e.yxy*eps ) +
					  e.xxx*map( pos + e.xxx*eps ) );
}

// Return a perpendicular direction, non-canonical
vec3 perp(vec3 dir) {
    return dir.x == 0.0 && dir.z == 0.0 ?
        vec3(1.0, 0.0, 0.0) :
        normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
}

// Compute principal curvature values
vec2 calcCurvature(vec3 pos, vec3 normal) {
    vec3 uu = perp(normal);
    vec3 vv = normalize(cross(uu, normal));
    const float eps = 0.002;
    const float eps2 = eps * eps;
    float val = map(pos);
    float dxx = (map(pos + eps * uu) + map(pos - eps * uu) - 2.0 * val) / eps2;
    float dyy = (map(pos + eps * vv) + map(pos - eps * vv) - 2.0 * val) / eps2;
    float dxy = (map(pos + eps * (uu + vv)) + map(pos + eps * (-uu - vv)) -
                 map(pos + eps * (uu - vv)) - map(pos + eps * (-uu + vv))) / (4.0 * eps2);
    float D = sqrt((dxx - dyy) * (dxx - dyy) + 4.0 * dxy * dxy);
    return vec2(dxx + dyy + D, dxx + dyy - D) / 2.0;
}

void main() {
    // Pixel coordinates, normalized so that p.y in range [-1, 1]
    vec2 p = (2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y;

    // View ray from camera
    vec3 ww = normalize(center - eye);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 dir = normalize(p.x * uu + p.y * vv + 1.5 * ww);

    // Ray-marching
    float tmax = 100.0;
    float t = 0.0;
    for (int i = 0; i < 256; i++) {
        vec3 pos = eye + t * dir;
        float h = map(pos);
        if (h < 0.0001 || t > tmax) break;
        t += h;
    }

    vec3 color = vec3(0.0);
    if (t < tmax) {
        vec3 pos = eye + t * dir;
        vec3 normal = calcNormal(pos);
        if (cmode) {
            vec2 curv = calcCurvature(pos, normal);
            color = vec3(0.2 * curv + 0.5, -0.2 * curv.x * 0.5); // for now
        }
        else {
            color = vec3(0.5) + 0.5 * normal;
        }
    }

    gl_FragColor = vec4(color, 1.0);
}
