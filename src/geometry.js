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
  const curvature = [];
  const indexInTriangle = [];
  for (const [a, b, c] of mesh.triangles) {
    const n = position.length;
    elements.push(n, n + 1, n + 2);
    position.push(mesh.positions[a], mesh.positions[b], mesh.positions[c]);
    normal.push(mesh.normals[a], mesh.normals[b], mesh.normals[c]);
    curvature.push(
      mesh.curvature_min[a],
      mesh.curvature_min[b],
      mesh.curvature_min[c]
    );
    indexInTriangle.push(0, 1, 2);
  }
  return {
    elements,
    attributes: {
      position,
      normal,
      indexInTriangle,
      curvature,
    },
  };
}
