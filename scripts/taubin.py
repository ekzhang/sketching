import open3d as o3d
import numpy as np
from scipy.linalg import eig
import mcubes #pip install --upgrade PyMCubes
import json
import argparse

# -- Begin primitive SDFs from
# https://iquilezles.org/www/articles/distfunctions/distfunctions.htm

def length(p):
    return np.linalg.norm(p, axis=-1)

def mix(x, y, a):
    return (1-a)*x + a*y

def sdSphere(p, s):
    return length(p) - s

def sdBox(p, b):
    q = np.abs(p) - b
    return length(np.maximum(q, 0)) + np.minimum(np.amax(q, axis=-1), 0)

def sdCylinder(p, c):
    return length(np.take(p, [0,2], -1) -np.take(c, [0,1], -1)) - c[...,2]

def sdTorus(p, t):
    q = np.concatenate([length(np.take(p, [0,2], -1))[...,None]-t[...,0],p[...,1][...,None]], axis=-1)
    return length(q)-t[...,1]

# End primitive SDFs --

def opSmoothUnion(d1, d2, k):
    h = np.clip( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 )
    return mix( d2, d1, h) - k*h*(1-h)

def sdf_map(pos, example):
    if example == 1:
        torus = sdTorus(pos, np.array([1.0, 0.15]))
        sphere = sdSphere(pos - np.array([1.0, 0.0, 0.0]), 0.2)
        return opSmoothUnion(torus, sphere, 0.4)
    elif example == 2:
        base = np.maximum(sdSphere(pos, 1.0), sdBox(pos, np.array([0.75]*3)))
        cyl1 = sdCylinder(np.take(pos,[0,1,2], -1), np.array([0.0, 0.0, 0.5]))
        cyl2 = sdCylinder(np.take(pos,[1,2,0], -1), np.array([0.0, 0.0, 0.5]))
        cyl3 = sdCylinder(np.take(pos,[2,0,1], -1), np.array([0.0, 0.0, 0.5]))
        return np.maximum(-np.amin([cyl1, cyl2, cyl3], axis=0), base)

def mesh_from_sdf(example, n=40):
    x = np.linspace(-2, 2, n)
    y = np.linspace(-2, 2, n)
    z = np.linspace(-2, 2, n)
    coord_grid = np.concatenate([coord[...,None] for coord in np.meshgrid(x, y, z, sparse=False)], axis=-1)
    sdf_grid = sdf_map(coord_grid, example)
    vertices, triangles = mcubes.marching_cubes(sdf_grid, 0)
    print(vertices.shape, triangles.shape)
    mesh = o3d.geometry.TriangleMesh()
    mesh.vertices = o3d.utility.Vector3dVector(vertices)
    mesh.triangles = o3d.utility.Vector3iVector(triangles[:,::-1])
    return mesh

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
            if abs(test_normal ** 2 - 1) < 1e-1:
                cnt += 1
                continue
            if 2 * eigvals[j] < np.sum(eigvals):
                curvature_min[i,:] = eigvecs[:,j]
            else:
                curvature_max[i,:] = eigvecs[:,j]
        #assert cnt == 1, "Eigenvector equal to normal not found"
        if cnt != 1:
            #only occurs when matrix is all zero
            print("???", i, cnt)
            print(matrices[i])

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

def center_mesh(mesh):
    vertices = np.array(mesh.vertices)
    mean = np.mean(vertices, axis=0)
    normalization = np.amax(np.linalg.norm(vertices-mean, axis=-1))
    new_vertices = (vertices-mean)/normalization
    mesh.vertices = o3d.utility.Vector3dVector(new_vertices)
    return mesh

#https://stackoverflow.com/questions/1447287/format-floats-with-standard-json-module
def pretty_floats(obj):
    if isinstance(obj, float):
        return float("%.5g" % obj)
    elif isinstance(obj, dict):
        return dict((k, pretty_floats(v)) for k, v in obj.items())
    elif isinstance(obj, (list, tuple)):
        return list(map(pretty_floats, obj))
    return obj

def write_data(mesh, filename):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices).tolist()
    normals = np.array(mesh.vertex_normals).tolist()
    triangles = np.array(mesh.triangles).tolist()
    #curvature_min, curvature_max = [[1,0,0] for i in range(len(vertices))], [[0,1,0] for i in range(len(vertices))]
    curvature_min, curvature_max = compute_curvature_directions(mesh)
    curvature_min = curvature_min.tolist()
    curvature_max = curvature_max.tolist()

    for x in vertices:
        assert x is not None
    for x in normals:
        assert x is not None
    for x in curvature_min:
        assert x is not None
    for x in curvature_max:
        assert x is not None

    data = {
        "positions": vertices,
        "triangles": triangles,
        "normals": normals,
        "curvature_min": curvature_min,
        "curvature_max": curvature_max,
    }
    with open(filename, "w") as f:
        json.dump(pretty_floats(data), f)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        default = "model",
        choices = ["model", "sdf"],
        required = True
    )
    parser.add_argument(
        "--input",
        type = str,
        required = False,
        help = "input file (model)"
    )
    parser.add_argument(
        "--example",
        default = 1,
        type = int,
        help = "example (sdf)"
    )
    parser.add_argument(
        "--resolution",
        default = 100,
        type = int,
        help = "grid size n x n x n (sdf)"
    )
    parser.add_argument(
        "--output",
        type = str,
        required = True,
        help = "output file"
    )
    parser.add_argument('--vis', dest='vis', action='store_true')
    parser.add_argument('--no-vis', dest='vis', action='store_false')
    parser.set_defaults(vis=False)
    parser.add_argument('--simplify', dest='simplify', action='store_true')
    parser.add_argument('--no-simplify', dest='simplify', action='store_false')
    parser.set_defaults(simplify=True)
    parser.add_argument(
        "--target_num",
        default = 10000,
        type = int,
        help = "number of triangles after simplification"
    )
    args = parser.parse_args()
    
    if args.source == "model":
        mesh = o3d.io.read_triangle_mesh(args.input)
    else:
        mesh = mesh_from_sdf(args.example, args.resolution)
    
    if args.simplify:
        mesh = mesh.simplify_quadric_decimation(args.target_num)

    mesh = center_mesh(mesh)
    if args.vis:
        visualize_curvature_directions(mesh)
    write_data(mesh, args.output)
