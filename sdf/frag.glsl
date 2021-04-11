#extension GL_EXT_draw_buffers : require
#extension GL_OES_standard_derivatives : enable
precision mediump float;

uniform vec3 resolution;
uniform float pixelRatio;
uniform vec3 eye;
uniform vec3 center;
uniform int example;

// -- Begin primitive SDFs from
// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm

float sdSphere(vec3 p, float s) {
    return length(p)-s;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdCylinder(vec3 p, vec3 c) {
  return length(p.xz-c.xy)-c.z;
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
    if (example == 1) {
        float torus = sdTorus(pos, vec2(1.0, 0.15));
        float sphere = sdSphere(pos - vec3(1.0, 0.0, 0.0), 0.2);
        return opSmoothUnion(torus, sphere, 0.4);
    } else if (example == 2) {
        float base = max(sdSphere(pos, 1.0), sdBox(pos, vec3(0.75)));
        float cyl1 = sdCylinder(pos.xyz, vec3(0.0, 0.0, 0.5));
        float cyl2 = sdCylinder(pos.yzx, vec3(0.0, 0.0, 0.5));
        float cyl3 = sdCylinder(pos.zxy, vec3(0.0, 0.0, 0.5));
        return max(-min(cyl1, min(cyl2, cyl3)), base);
    }
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

// Compute minimum curvature direction
vec3 calcCurvature(vec3 pos, vec3 normal) {
    vec3 uu = perp(normal);
    vec3 vv = normalize(cross(uu, normal));
    const float eps = 0.002;
    const float eps2 = eps * eps;
    float val = map(pos);

    // Hessian matrix - estimate II in local coordinates
    float dxx = (map(pos + eps * uu) + map(pos - eps * uu) - 2.0 * val) / eps2;
    float dyy = (map(pos + eps * vv) + map(pos - eps * vv) - 2.0 * val) / eps2;
    float ddxy = (map(pos + eps * (uu + vv)) + map(pos + eps * (-uu - vv)) -
                  map(pos + eps * (uu - vv)) - map(pos + eps * (-uu + vv))) / (2.0 * eps2);

    // If we happen to already have a diagonal matrix, then just return
    if (ddxy == 0.0) {
        return abs(dxx) < abs(dyy) ? uu : vv;
    }

    // Eigenvalues and eigenvectors of 2x2 Hessian
    float D = sqrt((dxx - dyy) * (dxx - dyy) + ddxy * ddxy);
    float lam1 = (dxx + dyy + D) / 2.0;
    vec3 v1 = normalize(ddxy * uu + (dyy - dxx + D) * vv);
    float lam2 = (dxx + dyy - D) / 2.0;
    vec3 v2 = normalize(ddxy * uu + (dyy - dxx - D) * vv);
    return abs(lam1) < abs(lam2) ? v1 : v2;
}

float lambert(vec3 pos, vec3 normal, vec3 light) {
    vec3 wo = light - pos;
    return max(0.0, dot(normalize(wo), normal)) / dot(wo, wo);
}

// Lambertian shading
vec3 calcColor(vec3 pos, vec3 normal) {
    float mag = 0.0;
    if (example == 1) {
        mag += 3.0 * lambert(pos, normal, vec3(0.8, 2.0, 0.5));
    } else if (example == 2) {
        mag += 2.0 * lambert(pos, normal, vec3(1.5, 2.0, 1.0));
        mag += 15.0 * lambert(pos, normal, vec3(0.0, 8.0, 0.0));
    }
    return vec3(sqrt(mag + 0.001)); // inverse gamma correction
}

void main() {
    // Pixel coordinates, normalized so that p.y in range [-1, 1]
    vec2 p = (2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y;

    // View ray from camera
    vec3 ww = normalize(center - eye);
    vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize(cross(uu, ww));
    vec3 dir = normalize(p.x * uu + p.y * vv + 3.0 * ww);

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

        // World-space curvature vector
        vec3 curv = calcCurvature(pos, normal);

        // Screen-space curvature vector
        vec2 sbase = vec2(dot(dir, uu), dot(dir, vv)) / dot(dir, ww);
        vec3 wto = pos + curv - eye;
        vec2 sto = vec2(dot(wto, uu), dot(wto, vv)) / dot(wto, ww);
        vec2 ssc = normalize(sto - sbase);

        vec3 color = calcColor(pos, normal);

        float vDotN = abs(dot(normalize(normal), normalize(pos - eye)));
        float vDotNGrad = fwidth(vDotN);
        float cartoonEdge = smoothstep(0.75, 1.25, vDotN / vDotNGrad / 3.0 / pixelRatio);

        gl_FragData[0] = vec4(normal, cartoonEdge);
        gl_FragData[1] = vec4(ssc, 0.0, 1.0);
        gl_FragData[2] = vec4(color, 1.0);
    }
}
