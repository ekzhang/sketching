import open3d as o3d
import numpy as np
from scipy.linalg import eig
import json


def compute_curvature_directions(mesh):
    mesh.compute_vertex_normals()

    vertices = np.array(mesh.vertices)
    triangles = np.array(mesh.triangles)

    n = vertices.shape[0]
    m = triangles.shape[0]

    normals = np.array(mesh.vertex_normals)
    areas = np.zeros((m), dtype=float)
    matrices = np.zeros((n, 3, 3), dtype=float)
    curvature_max = np.zeros((n, 3), dtype=float)
    curvature_min = np.zeros((n, 3), dtype=float)

    edges = [[] for i in range(n)]

    for i in range(m):
        a, b, c = vertices[triangles[i,0]], vertices[triangles[i,1]], vertices[triangles[i,2]]
        areas[i] = 0.5 * np.linalg.norm(np.cross(a-b, a-c))
        for ja in range(3):
            jb = (ja+1)%3
            jc = (ja+2)%3
            edges[triangles[i,ja]].append((triangles[i,jb], i))
            edges[triangles[i,ja]].append((triangles[i,jc], i))

    for i in range(n):
        total_area = 0
        nv = normals[i][:,None]
        inn = np.identity(3) - nv @ nv.T
        if len(edges[i]) == 0:
            continue
        for u, tri in edges[i]:
            uv = (vertices[u] - vertices[i])[:,None]
            innuv = inn @ uv
            t = (innuv) / np.linalg.norm(innuv)
            kappa = 2 * np.inner(nv[:,0], uv[:,0]) / np.inner(uv[:,0], uv[:,0])

            total_area += areas[tri]
            matrices[i,:,:] += areas[tri] * kappa * (t @ t.T)

        matrices[i,:,:] /= total_area

        eigvals, eigvecs = eig(matrices[i])
        cnt = 0
        for j in range(3):
            test_normal = np.dot(eigvecs[:,j], normals[i])
            if abs(test_normal ** 2 - 1) < 1e-3:
                cnt += 1
                continue
            if 2 * eigvals[j] < np.sum(eigvals):
                curvature_min[i,:] = eigvecs[:,j]
            else:
                curvature_max[i,:] = eigvecs[:,j]
        assert cnt == 1, "Eigenvector equal to normal not found"

    return curvature_min, curvature_max

def get_lineset(vertices, vectors, color, l=0.01):
    n = vertices.shape[0]
    vertices = np.tile(vertices, (2, 1))
    vertices[n:,:] += vectors * l
    colors = [color for i in range(n)]
    lines = [[i, i+n] for i in range(n)]
    line_set = o3d.geometry.LineSet(
        points=o3d.utility.Vector3dVector(vertices),
        lines=o3d.utility.Vector2iVector(lines),
    )
    line_set.colors = o3d.utility.Vector3dVector(colors)
    return line_set

def visualize_curvature_directions(mesh, l=0.01, show_normals=False):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices)
    normals = np.array(mesh.vertex_normals)
    n = vertices.shape[0]
    curvature_min, curvature_max = compute_curvature_directions(mesh)

    line_set_max = get_lineset(vertices, curvature_max, [1, 0, 0])
    line_set_min = get_lineset(vertices, curvature_min, [0, 1, 0])
    line_set_normal = get_lineset(vertices, normals, [0, 0, 1])

    if show_normals:
        o3d.visualization.draw_geometries([mesh, line_set_min, line_set_max, line_set_normal])
    else:
        o3d.visualization.draw_geometries([mesh, line_set_min, line_set_max])

def write_data(mesh, filename):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices).tolist()
    normals = np.array(mesh.vertex_normals).tolist()
    triangles = np.array(mesh.triangles).tolist()
    curvature_min, curvature_max = compute_curvature_directions(mesh)
    curvature_min = curvature_min.tolist()
    curvature_max = curvature_max.tolist()

    data = {
        "positions": vertices,
        "triangles": triangles,
        "normals": normals,
        "curvature_min": curvature_min,
        "curvature_max": curvature_max,
    }
    with open(filename, "w") as f:
        json.dump(data, f)

mesh = o3d.io.read_triangle_mesh("../models/bunny_1k.obj")
mesh = mesh.subdivide_loop(2)
#visualize_curvature_directions(mesh)
write_data(mesh, "../models/bunny_1k_2_sub.json")
