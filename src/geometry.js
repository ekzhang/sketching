import { vec3 } from "gl-matrix";

/**
 * Load a mesh, returning an expanded form with calculated attributes.
 *
 * Each vertex in the mesh is duplicated n times, where n is the number of
 * triangles adjacent to that vertex. Each triangle consists of three vertices
 * labeled A/B/C, which are unique to that triangle.
 */
export function loadMesh(mesh) {
  const elements = [];
  const position = [];
  const normal = [];
  const indexInTriangle = [];
  const texCoordA = [];
  const texCoordB = [];
  const texCoordC = [];
  for (const [a, b, c] of mesh.triangles) {
    const n = position.length;
    elements.push(n, n + 1, n + 2);
    position.push(mesh.positions[a], mesh.positions[b], mesh.positions[c]);
    normal.push(mesh.normals[a], mesh.normals[b], mesh.normals[c]);
    indexInTriangle.push(0, 1, 2);

    const [abu, abv, acu, acv] = localCoords(mesh, a, b, c);
    const [bau, bav, bcu, bcv] = localCoords(mesh, b, a, c);
    const [cbu, cbv, cau, cav] = localCoords(mesh, c, b, a);
    texCoordA.push([0, 0], [abu, abv], [acu, acv]);
    texCoordB.push([bau, bav], [0, 0], [bcu, bcv]);
    texCoordC.push([cau, cav], [cbu, cbv], [0, 0]);
  }
  console.log(texCoordA);
  return {
    elements,
    attributes: {
      position,
      normal,
      indexInTriangle,
      texCoordA,
      texCoordB,
      texCoordC,
    },
  };
}

function localCoords(mesh, a, b, c) {
  const bu = mesh.curvature_min[a];
  const bv = mesh.curvature_max[a];
  return [
    vec3.dot(bu, vec3.sub([], mesh.positions[b], mesh.positions[a])),
    vec3.dot(bv, vec3.sub([], mesh.positions[b], mesh.positions[a])),
    vec3.dot(bu, vec3.sub([], mesh.positions[c], mesh.positions[a])),
    vec3.dot(bv, vec3.sub([], mesh.positions[c], mesh.positions[a])),
  ];
}
