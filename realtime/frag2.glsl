#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_draw_buffers : require
precision mediump float;

varying vec3 vPosition, vNormal;

uniform mat4 view, projection;
uniform vec3 resolution;
uniform float pixelRatio;
uniform float scale;
uniform float numTextures;
uniform sampler2D normalTex;
uniform sampler2D positionTex;
uniform vec3 eye;

vec2 screenspace(vec3 dir, vec3 position) {
    vec4 mvp = projection * view * vec4(position, 1.0);
    vec4 mvp2 = projection * view * vec4(position + dir, 1.0);
    return (mvp2.xy / mvp2.w) - (mvp.xy / mvp.w);
}

mat3 transpose(mat3 A){
    return mat3(
        A[0][0], A[1][0], A[2][0],
        A[0][1], A[1][1], A[2][1],
        A[0][2], A[1][2], A[2][2]
    );
}

//rotation from unit vector a to unit vector b about normal to both
//http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/
mat3 rotationMatrix(vec3 a, vec3 b)
{
    vec3 cr = cross(a, b);
    vec3 axis = normalize(cross(a, b));
    float s = -length(cr);
    float c = dot(a, b);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

mat2 getLMN(vec3 v0, vec3 v1, vec3 v2, vec3 n0, vec3 n1, vec3 n2){
    vec3 ax, ay, az, ATb, LMN;
    vec2 e0, e1, e2, dn0, dn1, dn2;
    float area, p, q, r, detB;
    mat3 proj, Binv;

    area = length(cross(v1-v0, v2-v0))/2.0;
    ax = normalize(v1-v0);
    ay = normalize(cross(ax, v2-v0));
    az = normalize(cross(ax, ay));
    proj = transpose(mat3(ax, ay, az));
    e0 = (proj * (v2 - v1)).xz;
    e1 = (proj * (v2 - v0)).xz;
    e2 = (proj * (v1 - v0)).xz;
    dn0 = (proj * (n2 - n1)).xz;
    dn1 = (proj * (n2 - n0)).xz;
    dn2 = (proj * (n1 - n0)).xz;
    p = e0.x*e0.x+e1.x*e1.x+e2.x*e2.x;
    q = e0.x*e0.y+e1.x*e1.y+e2.x*e2.y;
    r = e0.y*e0.y+e1.y*e1.y+e2.y*e2.y;
    detB = (p+r)*(p*r-q*q);
    detB = (2.0*step(0.0, detB)-1.0) * max(abs(detB), 0.00001);
    Binv = 1.0/detB * mat3(
        r*(r+p)-q*q, -q*r, q*q,
        -q*r, p*r, -p*q,
        q*q, -p*q, p*(r+p)-q*q
    );
    ATb = vec3(
        e0.x * dn0.x + e1.x * dn1.x + e2.x * dn2.x,
        e0.x * dn0.y + e0.y * dn0.x + e1.x * dn1.y + e1.y * dn1.x + e2.x * dn2.y + e2.y * dn2.x,
        e0.y * dn0.y + e1.y * dn1.y + e2.y * dn2.y
    );
    LMN = Binv * ATb;
    return mat2(LMN.x, LMN.y, LMN.y, LMN.z);
}

mat2 updateLMN(vec3 v0, vec3 v1, vec3 v2, vec3 n0, vec3 n1, vec3 n2, vec3 tax, vec3 tay, vec3 taz, mat2 LMNcur){
    vec3 ax, ay, az, rax, raz;
    mat2 LMN;
    mat3 rot;
    float area, L, M, N;
    //tax = normalize((v1-v0) - dot(v1-v0, n0) * n0);
    //tay = n0;
    //taz = normalize(cross(tax, tay));

    LMN = getLMN(v0, v1, v2, n0, n1, n2);
    area = length(cross(v1-v0, v2-v0))/2.0;
    ax = normalize(v1-v0);
    ay = normalize(cross(ax, v2-v0));
    az = normalize(cross(ax, ay));
    rot = rotationMatrix(ay, tay);
    rax = rot * ax;
    raz = rot * az;
    L = dot(vec2(dot(tax, rax), dot(tax, raz)), LMN * vec2(dot(tax, rax), dot(tax, raz)));
    M = dot(vec2(dot(tax, rax), dot(tax, raz)), LMN * vec2(dot(taz, rax), dot(taz, raz)));
    N = dot(vec2(dot(taz, rax), dot(taz, raz)), LMN * vec2(dot(taz, rax), dot(taz, raz)));
    return LMNcur + area * mat2(L, M, M, N);
}

vec3 getMinDirection(vec3 ax, vec3 az, mat2 LMN){
    float L = LMN[0][0], M = LMN[0][1], N = LMN[1][1];
    // Eigenvalues and eigenvectors of 2x2 matrix
    float D = sqrt((L - N) * (L - N) + 4.0 * M * M);
    float lam1 = (L + N + D) / 2.0;
    vec3 v1 = normalize(2.0 * M * ax + (N - L + D) * az);
    float lam2 = (L + N - D) / 2.0;
    vec3 v2 = normalize(2.0 * M * ax + (N - L - D) * az);
    return abs(lam1) < abs(lam2) ? v1 : v2;
}

void main() {
    float eps = 3.0;
    vec2 tp = gl_FragCoord.xy / resolution.xy;
    vec2 dx = eps * vec2(1.0, 0.0) / resolution.x;
    vec2 dy = eps * vec2(0.0, 1.0) / resolution.y;

    //2---1---8
    //| \ | / |
    //3---0---7
    //| / | \ |
    //4---5---6

    vec3 v0 = texture2D(positionTex, tp).xyz;
    vec3 v1 = texture2D(positionTex, tp+dy).xyz;
    vec3 v2 = texture2D(positionTex, tp-dx+dy).xyz;
    vec3 v3 = texture2D(positionTex, tp-dx).xyz;
    vec3 v4 = texture2D(positionTex, tp-dx-dy).xyz;
    vec3 v5 = texture2D(positionTex, tp-dy).xyz;
    vec3 v6 = texture2D(positionTex, tp+dx-dy).xyz;
    vec3 v7 = texture2D(positionTex, tp+dx).xyz;
    vec3 v8 = texture2D(positionTex, tp+dx+dy).xyz;

    vec3 n0 = texture2D(normalTex, tp).xyz;
    vec3 n1 = texture2D(normalTex, tp+dy).xyz;
    vec3 n2 = texture2D(normalTex, tp-dx+dy).xyz;
    vec3 n3 = texture2D(normalTex, tp-dx).xyz;
    vec3 n4 = texture2D(normalTex, tp-dx-dy).xyz;
    vec3 n5 = texture2D(normalTex, tp-dy).xyz;
    vec3 n6 = texture2D(normalTex, tp+dx-dy).xyz;
    vec3 n7 = texture2D(normalTex, tp+dx).xyz;
    vec3 n8 = texture2D(normalTex, tp+dx+dy).xyz;

    mat2 LMN = mat2(0.0);
    vec3 tax, tay, taz;
    vec3 test = vec3(1.0, 1.0, 1.0);
    tax = normalize(test - dot(test, n0) * n0);
    tay = n0;
    taz = normalize(cross(tax, tay));

    LMN = updateLMN(v0, v1, v2, n0, n1, n2, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v2, v3, n0, n2, n3, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v3, v4, n0, n3, n4, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v4, v5, n0, n4, n5, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v5, v6, n0, n5, n6, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v6, v7, n0, n6, n7, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v7, v8, n0, n7, n8, tax, tay, taz, LMN);
    LMN = updateLMN(v0, v8, v1, n0, n8, n1, tax, tay, taz, LMN);
    
    vec3 direction = getMinDirection(tax, taz, LMN);
    gl_FragData[0] = vec4(direction, 1.0);
}
