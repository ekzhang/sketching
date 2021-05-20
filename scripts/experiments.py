import os
import open3d as o3d
import numpy as np
from matplotlib import cm

import curvature

def torus_experiment(curvature_func, save_dir):
    torus_radius = 1.0
    tube_radius = 0.5
    mesh = o3d.geometry.TriangleMesh.create_torus(torus_radius=torus_radius, tube_radius=tube_radius, radial_resolution=90, tubular_resolution=60)
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices)
    normals = np.array(mesh.vertex_normals)
    n = vertices.shape[0]
    
    curvature_min, curvature_max, eig_min, eig_max, _ = curvature_func(mesh)

    line_set_max = curvature.get_lineset(vertices, curvature_max, [1, 0, 0])
    line_set_min = curvature.get_lineset(vertices, curvature_min, [0, 1, 0])
    line_set_normal = curvature.get_lineset(vertices, normals, [0, 0, 1])

    visualize([mesh, line_set_min, line_set_max], "Principal curvature directions")
    
    old_colors = np.array(mesh.vertex_colors)
    paint = cm.get_cmap("seismic")
    gaussian_curvature = eig_min * eig_max
    print("Gaussian curvature:\t{:.4f}\t{:.4f}".format(gaussian_curvature.min(), gaussian_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(gaussian_curvature/1 + 0.5)[:,:3])
    visualize([mesh], "Gaussian curvature", os.path.join(save_dir, "gaussian_curvature_approximation.png"))
    paint = cm.get_cmap("PiYG")
    mean_curvature = 1/2 * (eig_min + eig_max)
    print("Mean curvature:\t\t{:.4f}\t{:.4f}".format(mean_curvature.min(), mean_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(mean_curvature/1 + 0.5)[:,:3])
    visualize([mesh], "Mean curvature", os.path.join(save_dir, "mean_curvature_approximation.png"))

    cosv = np.linalg.norm(vertices[:,:2], axis=1) - torus_radius
    true_gaussian_curvature = cosv / (tube_radius * (torus_radius + tube_radius * cosv))
    true_mean_curvature = (torus_radius + 2 * tube_radius * cosv) / (2 * tube_radius * (torus_radius + tube_radius * cosv))
    paint = cm.get_cmap("seismic")
    print("True Gaussian curvature:\t{:.4f}\t{:.4f}".format(true_gaussian_curvature.min(), true_gaussian_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(true_gaussian_curvature/1 + 0.5)[:,:3])
    visualize([mesh], "Gaussian curvature", os.path.join(save_dir, "gaussian_curvature_exact.png"))
    paint = cm.get_cmap("PiYG")
    print("True mean curvature:\t\t{:.4f}\t{:.4f}".format(true_mean_curvature.min(), true_mean_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(true_mean_curvature/1 + 0.5)[:,:3])
    visualize([mesh], "Mean curvature", os.path.join(save_dir, "mean_curvature_exact.png"))
    
    mesh.vertex_colors = o3d.utility.Vector3dVector(old_colors)

def generic_experiment(mesh, curvature_func, save_dir, file_prefix):
    mesh.compute_vertex_normals()
    vertices = np.array(mesh.vertices)
    normals = np.array(mesh.vertex_normals)
    n = vertices.shape[0]
    curvature_min, curvature_max, eig_min, eig_max, _ = curvature_func(mesh)
    old_colors = np.array(mesh.vertex_colors)
    paint = cm.get_cmap("seismic")
    gaussian_curvature = eig_min * eig_max
    print("Gaussian curvature:\t{:.4f}\t{:.4f}".format(gaussian_curvature.min(), gaussian_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(gaussian_curvature/5 + 0.5)[:,:3])
    visualize([mesh], "Gaussian curvature", os.path.join(save_dir, file_prefix+"gaussian_curvature_approximation.png"))
    paint = cm.get_cmap("PiYG")
    mean_curvature = 1/2 * (eig_min + eig_max)
    print("Mean curvature:\t\t{:.4f}\t{:.4f}".format(mean_curvature.min(), mean_curvature.max()))
    mesh.vertex_colors = o3d.utility.Vector3dVector(paint(mean_curvature/5 + 0.5)[:,:3])
    visualize([mesh], "Mean curvature", os.path.join(save_dir, file_prefix+"mean_curvature_approximation.png"))
    mesh.vertex_colors = o3d.utility.Vector3dVector(old_colors)

def simple_check():
    mesh = o3d.geometry.TriangleMesh()
    h = 1.0
    mesh.vertices = o3d.utility.Vector3dVector(
        np.array(
            [
                [0.0, 0.0, h],
                [1.0, 0.0, 0.0],
                [0.0, 1.0, 0.0],
                [-1.0, 0.0, 0.0],
                [0.0, -1.0, 0.0]
            ]
        )
    )
    mesh.triangles = o3d.utility.Vector3iVector(
        np.array(
            [
                [0, 1, 2],
                [0, 2, 3],
                [0, 3, 4],
                [0, 4, 1],
                [1, 3, 2],
                [1, 4, 3]
            ]
        )
    )

    curvature_min, curvature_max, eig_min, eig_max, _ = curvature.compute_curvature_directions_taubin(mesh)

#simple_check()
#torus_experiment(curvature.compute_curvature_directions_taubin, "taubin")
#torus_experiment(curvature.compute_curvature_directions_rusinkiewicz, "rusinkiewicz")

#mesh = o3d.io.read_triangle_mesh("../models/bunny/reconstruction/bun_zipper.ply")
mesh = o3d.io.read_triangle_mesh("../models/bunny_1k_2_sub.obj")
mesh = curvature.center_mesh(mesh)
#mesh = o3d.geometry.TriangleMesh.create_sphere(radius=4.0, resolution=20)
generic_experiment(mesh, curvature.compute_curvature_directions_taubin, "taubin", "bunny")
generic_experiment(mesh, curvature.compute_curvature_directions_rusinkiewicz, "rusinkiewicz", "bunny")