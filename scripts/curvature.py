import open3d as o3d
import numpy as np
from scipy.linalg import eig
from scipy.spatial.transform import Rotation
import mcubes #pip install --upgrade PyMCubes
import json
import argparse
from matplotlib import cm

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

def compute_curvature_directions_taubin(mesh):
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
    curvature_max[:,0] = 1
    curvature_min[:,0] = 1
    eig_max = np.zeros((n,), dtype=float)
    eig_min = np.zeros((n,), dtype=float)
    confidence = np.zeros((n,), dtype=float)

    eps = 1e-8
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
        nv = -normals[i][:,None]
        inn = np.identity(3) - nv @ nv.T
        if len(edges[i]) == 0:
            continue
        for u, tri in edges[i]:
            uv = (vertices[u] - vertices[i])[:,None]
            if areas[tri] < eps or np.linalg.norm(uv) < eps:
                #print(areas[tri], np.inner(uv[:,0], uv[:,0]))
                continue
            innuv = inn @ uv
            fail_count = 0
            while np.linalg.norm(innuv) < eps and fail_count < 10:
                uv += np.random.normal(0, 0.01 * np.linalg.norm(uv), uv.shape)
                innuv = inn @ uv
                fail_count += 1
            if fail_count >= 10:
                continue

            t = innuv / np.linalg.norm(innuv)
            kappa = 2 * np.inner(nv[:,0], uv[:,0]) / np.inner(uv[:,0], uv[:,0])

            total_area += areas[tri]
            matrices[i,:,:] += areas[tri] * kappa * (t @ t.T)

        #not necessary for finding eigenvectors
        if total_area > 0:
            matrices[i,:,:] /= total_area

        #print(i)
        #print(matrices[i,:,:])

        eigvals, eigvecs = eig(matrices[i])
        eigvals = eigvals.real
        eigvecs = eigvecs.real
        cnt = 0
        for j in range(3):
            test_normal = np.dot(eigvecs[:,j], normals[i])
            if abs(test_normal ** 2 - 1) < 1e-1:
                cnt += 1
                continue
            if 2 * eigvals[j] < np.sum(eigvals):
                curvature_min[i,:] = eigvecs[:,j]
                eig_min[i] = 4 * eigvals[j] - np.sum(eigvals)
            else:
                curvature_max[i,:] = eigvecs[:,j]
                eig_max[i] = 4 * eigvals[j] - np.sum(eigvals)
        #assert cnt == 1, "Eigenvector equal to normal not found"
        if cnt != 1:
            #only occurs when matrix is all zero
            print("???", i, cnt)
            #print(matrices[i])

    return curvature_min, curvature_max, eig_min, eig_max, confidence

def rand_vec(shape):
    p = np.random.normal(0, 1.0, shape)
    return p / np.linalg.norm(p)

def normalize(p):
    lenp = np.linalg.norm(p)
    if lenp < 1e-8:
        return rand_vec(p.shape)
    return p / lenp

def compute_voronoi_area(a, b, c):
    area = 0.5 * np.linalg.norm(np.cross(a-b, a-c))
    if area < 1e-8:
        return [area/3, area/3, area/3]
    if np.dot(a-b, a-c) < 0 or np.dot(b-c, b-a) < 0 or np.dot(c-a, c-b) < 0:
        return [area/3, area/3, area/3]
    ta = (np.linalg.norm(b-c)/2)**2 * np.dot(a-b, a-c)/np.linalg.norm(np.cross(a-b, a-c))
    tb = (np.linalg.norm(c-a)/2)**2 * np.dot(b-c, b-a)/np.linalg.norm(np.cross(b-c, b-a))
    tc = (np.linalg.norm(a-b)/2)**2 * np.dot(c-a, c-b)/np.linalg.norm(np.cross(c-a, c-b))
    return [(tb+tc)/2, (tc+ta)/2, (ta+tb)/2]

def compute_curvature_directions_rusinkiewicz(mesh):
    mesh.compute_vertex_normals()

    vertices = np.array(mesh.vertices)
    triangles = np.array(mesh.triangles)

    n = vertices.shape[0]
    m = triangles.shape[0]

    normals = np.array(mesh.vertex_normals)
    vertex_areas = np.zeros((n), dtype=float)
    matrices = np.zeros((n, 2, 2), dtype=float)
    coordinates = np.zeros((n, 3, 3), dtype=float)
    curvature_max = np.zeros((n, 3), dtype=float)
    curvature_min = np.zeros((n, 3), dtype=float)
    eig_max = np.zeros((n,), dtype=float)
    eig_min = np.zeros((n,), dtype=float)
    confidence = np.zeros((n,), dtype=float)

    for i in range(n):
        test = rand_vec((3,))
        while np.linalg.norm(np.cross(test, normals[i])) < 5e-1:
            test = rand_vec((3,))
        coordinates[i,0,:] = normalize(test - np.dot(test, normals[i]) * normals[i])
        coordinates[i,1,:] = normals[i]
        coordinates[i,2,:] = normalize(np.cross(coordinates[i,0,:], coordinates[i,1,:]))

    for i in range(m):
        triangle = vertices[triangles[i,0]], vertices[triangles[i,1]], vertices[triangles[i,2]]
        areas = compute_voronoi_area(*triangle)
        for ja in range(3):
            jb = (ja+1)%3
            jc = (ja+2)%3
            idxA = triangles[i,ja]
            idxB = triangles[i,jb]
            idxC = triangles[i,jc]
            tax, tay, taz = coordinates[idxA,0], coordinates[idxA,1], coordinates[idxA,2]
            area = areas[ja]
            if area < 1e-8:
                continue
            ax = normalize(vertices[idxB] - vertices[idxA])
            ay = normalize(np.cross(vertices[idxB] - vertices[idxA], vertices[idxC] - vertices[idxA]))
            az = normalize(np.cross(ax, ay))
            proj = np.array([ax, ay, az])

            edgeA = (proj @ (vertices[idxC] - vertices[idxB]))[[0,2]]
            edgeB = (proj @ (vertices[idxC] - vertices[idxA]))[[0,2]]
            edgeC = (proj @ (vertices[idxB] - vertices[idxA]))[[0,2]]

            #inv(proj.T) = proj
            dnA = (proj @ (normals[idxC] - normals[idxB]))[[0,2]]
            dnB = (proj @ (normals[idxC] - normals[idxA]))[[0,2]]
            dnC = (proj @ (normals[idxB] - normals[idxA]))[[0,2]]

            A = np.array(
                [
                    [edgeA[0], edgeA[1], 0],
                    [0, edgeA[0], edgeA[1]],
                    [edgeB[0], edgeB[1], 0],
                    [0, edgeB[0], edgeB[1]],
                    [edgeC[0], edgeC[1], 0],
                    [0, edgeC[0], edgeC[1]],
                ],
                dtype=float
            )
            b = np.array(
                [
                    dnA[0],
                    dnA[1],
                    dnB[0],
                    dnB[1],
                    dnC[0],
                    dnC[1],
                ],
                dtype=float
            )

            x = np.linalg.inv(A.T @ A) @ A.T @ b
            LMN_local = np.array([[x[0], x[1]], [x[1], x[2]]], dtype=float)

            rot_axis = normalize(np.cross(ay, tay))
            if abs(np.dot(ay, tay)) > 1:
                print(ay, tay, np.dot(ay, tay), "???")
            rot_theta = np.arccos(np.clip(np.dot(ay, tay), -1, 1))
            rot = Rotation.from_rotvec(rot_theta * rot_axis).as_matrix()

            rax = rot @ ax
            raz = rot @ az
            L = np.dot(np.array([np.dot(tax, rax), np.dot(tax, raz)]), LMN_local @ np.array([np.dot(tax, rax), np.dot(tax, raz)]))
            M = np.dot(np.array([np.dot(tax, rax), np.dot(tax, raz)]), LMN_local @ np.array([np.dot(taz, rax), np.dot(taz, raz)]))
            N = np.dot(np.array([np.dot(taz, rax), np.dot(taz, raz)]), LMN_local @ np.array([np.dot(taz, rax), np.dot(taz, raz)]))

            vertex_areas[idxA] += area
            matrices[idxA,:,:] += np.array([[L, M], [M, N]]) * area
    
    for i in range(n):
        if vertex_areas[i] > 0:
            matrices[i] /= vertex_areas[i]
        eigvals, eigvecs = eig(matrices[i])
        eigvals = eigvals.real
        eigvecs = eigvecs.real
        up_proj = coordinates[i,[0,2],:].T
        argmin = 0 if eigvals[0] < eigvals[1] else 1
        curvature_min[i,:] = normalize(up_proj @ eigvecs[:,argmin])
        curvature_max[i,:] = normalize(up_proj @ eigvecs[:,argmin^1])
        eig_min[i] = eigvals[argmin]
        eig_max[i] = eigvals[argmin^1]

    return curvature_min, curvature_max, eig_min, eig_max, confidence

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

def get_arrows(vertices, vectors, color, l=0.01, r=0.01):
    pass

def visualize(geometries, window_name="", screenshot_path=None):
    vis = o3d.visualization.Visualizer()
    vis.create_window(window_name=window_name)
    for g in geometries:
        vis.add_geometry(g)
        vis.update_geometry(g)
        vis.poll_events()
        vis.update_renderer()
    if screenshot_path is not None:
        vis.capture_screen_image(screenshot_path)
    vis.destroy_window()

def visualize_curvature_directions(mesh, l=0.01, show_normals=False, show_curvature=True, taubin=False, save_path=None):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices)
    normals = np.array(mesh.vertex_normals)
    n = vertices.shape[0]
    if taubin:
        curvature_min, curvature_max, eig_min, eig_max, _ = compute_curvature_directions_taubin(mesh)
    else:
        curvature_min, curvature_max, eig_min, eig_max, _ = compute_curvature_directions_rusinkiewicz(mesh)
    

    line_set_max = get_lineset(vertices, curvature_max, [1, 0, 0])
    line_set_min = get_lineset(vertices, curvature_min, [0, 1, 0])
    line_set_normal = get_lineset(vertices, normals, [0, 0, 1])

    geometries = [mesh, line_set_min, line_set_max]
    if show_normals:
        geometries += [line_set_normal]
    if save_path is not None:
        visualize(geometries, "Curvature directions", save_path)
    else:
        o3d.visualization.draw_geometries(geometries)
    
    if show_curvature:
        old_colors = np.array(mesh.vertex_colors)
        paint = cm.get_cmap("seismic")
        gaussian_curvature = eig_min * eig_max
        print("Gaussian curvature:\t{:.4f}\t{:.4f}".format(gaussian_curvature.min(), gaussian_curvature.max()))
        mesh.vertex_colors = o3d.utility.Vector3dVector(paint(gaussian_curvature/5 + 0.5)[:,:3])
        o3d.visualization.draw_geometries([mesh])
        paint = cm.get_cmap("PiYG")
        mean_curvature = 1/2 * (eig_min + eig_max)
        print("Mean curvature:\t\t{:.4f}\t{:.4f}".format(mean_curvature.min(), mean_curvature.max()))
        mesh.vertex_colors = o3d.utility.Vector3dVector(paint(mean_curvature/5 + 0.5)[:,:3])
        o3d.visualization.draw_geometries([mesh])
        mesh.vertex_colors = o3d.utility.Vector3dVector(old_colors)

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

def write_data(mesh, filename, taubin=False):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices).tolist()
    normals = np.array(mesh.vertex_normals).tolist()
    triangles = np.array(mesh.triangles).tolist()
    #curvature_min, curvature_max = [[1,0,0] for i in range(len(vertices))], [[0,1,0] for i in range(len(vertices))]
    if taubin:
        curvature_min, curvature_max, _, _, _ = compute_curvature_directions_taubin(mesh)
    else:
        curvature_min, curvature_max, _, _, _ = compute_curvature_directions_rusinkiewicz(mesh)
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

def compare_taubin_rusinkiewicz(mesh):
    direction_minA, direction_maxA, eig_minA, eig_maxA, _ = compute_curvature_directions_taubin(mesh)
    direction_minB, direction_maxB, eig_minB, eig_maxB, _ =  compute_curvature_directions_rusinkiewicz(mesh)
    for i in range(0, eig_minA.shape[0], 100):
        print(i, eig_minA[i], eig_maxA[i], eig_minB[i], eig_maxB[i])
        print("taubin\t", direction_minA[i], direction_maxA[i])
        print("rusink\t", direction_minB[i], direction_maxB[i])
    visualize_curvature_directions(mesh, taubin=True)
    visualize_curvature_directions(mesh, taubin=False)

if __name__ == "__main__":
    #mesh = o3d.io.read_triangle_mesh("../models/bunny/reconstruction/bun_zipper.ply")
    #mesh = o3d.io.read_triangle_mesh("../models/csg.ply")
    mesh = o3d.io.read_triangle_mesh("../models/teapot-fix.obj")
    #mesh = mesh_from_sdf(1, 160)
    mesh = center_mesh(mesh)
    visualize_curvature_directions(mesh, taubin=False)

    #mesh = o3d.geometry.TriangleMesh.create_torus(torus_radius=1.0, tube_radius=0.5, radial_resolution=90, tubular_resolution=60)
    #mesh = o3d.geometry.TriangleMesh.create_sphere(radius=1.0, resolution=20)
    #compare_taubin_rusinkiewicz(mesh)
    exit()
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
    parser.add_argument('--taubin', dest='taubin', action='store_true')
    parser.set_defaults(taubin=False)
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
        visualize_curvature_directions(mesh, taubin=args.taubin)
    write_data(mesh, args.output, taubin=args.taubin)
