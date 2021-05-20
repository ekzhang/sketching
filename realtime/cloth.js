import { vec3 } from "gl-matrix";

//https://github.com/regl-project/regl/blob/gh-pages/example/cloth.js
export class Cloth {
  constructor(rows, cols) {
    this.t = 0;

    this.rows = rows;
    this.cols = cols;
    this.positions = [];
    this.oldPositions = [];
    this.normals = [];
    this.triangles = [];
    this.edges = []
    this.acc = []
    this.width = 2.0;
    this.height = this.width * (this.rows - 1) / (this.cols - 1);
    this.pins = [(this.rows - 1) * this.cols, (this.rows - 1) * this.cols + 1, this.rows * this.cols - 2, this.rows * this.cols - 1];
    const restLength = this.width / (this.cols - 1) * 0.95;
    const diagonalRestLength = Math.sqrt(2) * restLength;
    
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        let y = i / (this.rows - 1) * this.height - this.height / 2.0;
        let x = j / (this.cols - 1) * this.width - this.width / 2.0;
        this.positions.push([x, y, 0.0]);
        this.oldPositions.push([x, y, 0.0]);
        this.normals.push([0.0, 0.0, 1.0]);
        this.acc.push([0.0, 0.0, 0.0]);
      }
    }

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (i > 0 && j > 0) {
          this.triangles.push([i * this.cols + j, i * this.cols + j - 1, (i - 1) * this.cols + j - 1])
          this.triangles.push([i * this.cols + j, (i - 1) * this.cols + j - 1, (i - 1) * this.cols + j])

          this.edges.push([i * this.cols + j, i * this.cols + j - 1, restLength])
          this.edges.push([i * this.cols + j - 1, (i - 1) * this.cols + j - 1, restLength])
          this.edges.push([(i - 1) * this.cols + j - 1, i * this.cols + j, diagonalRestLength])
          this.edges.push([(i - 1) * this.cols + j, i * this.cols + j - 1, diagonalRestLength])
          this.edges.push([(i - 1) * this.cols + j - 1, (i - 1) * this.cols + j, restLength])
          this.edges.push([(i - 1) * this.cols + j, i * this.cols + j, restLength])
        }
        if (i > 0 && i < this.rows - 1) {
            this.edges.push([(i - 1) * this.cols + j, (i + 1) * this.cols + j, 2.0 * restLength]);
        }
        if (j > 0 && j < this.cols - 1) {
            this.edges.push([i * this.cols + j - 1, i * this.cols + j + 1, 2.0 * restLength]);
        }
      }
    }
  }

  step() {
    const MASS = 1.0;
    const HOOKE = 1.0;
    const DRAG = 0.03;
    const DT = 0.01;
    this.windForce = [Math.sin(this.t / 20.0), Math.cos(this.t / 30.0), Math.sin(this.t / 10.0)];
    vec3.normalize(this.windForce, this.windForce);
    vec3.scale(this.windForce, this.windForce, 0.5);
    this.gravity = [0.0, -1.0, 0.0];

    
    for (let i = 0 ; i < this.positions.length; i++) {
      let newPos = [];
      vec3.scale(newPos, this.positions[i], 2.0 - DRAG);
      vec3.scaleAndAdd(newPos, newPos, this.oldPositions[i], DRAG - 1.0);
      vec3.scaleAndAdd(newPos, newPos, this.acc[i], 0.5 * DT * DT);
      this.oldPositions[i] = this.positions[i];
      this.positions[i] = newPos;

      this.normals[i] = [0.0, 0.0, 0.0];
    }
    console.log(this.positions[0], this.oldPositions[0]);
    
    for (let i = 0; i < this.pins.length; i++) {
      this.positions[this.pins[i]] = this.oldPositions[this.pins[i]];
    }

    for (let i = 0; i < this.triangles.length; i++){
        let u = this.triangles[i][0], v = this.triangles[i][1], w = this.triangles[i][2];
        let euv = [], euw = [], n = [];
        vec3.sub(euv, this.positions[u], this.positions[v]);
        vec3.sub(euw, this.positions[u], this.positions[w]);
        vec3.cross(n, euv, euw);
        vec3.add(this.normals[u], this.normals[u], n);
        vec3.add(this.normals[v], this.normals[v], n);
        vec3.add(this.normals[w], this.normals[w], n);
    }

    for (let i = 0; i < this.positions.length; i++) {
      vec3.normalize(this.normals[i], this.normals[i]);
      vec3.set(this.acc[i], 0.0, 0.0, 0.0);
      vec3.add(this.acc[i], this.acc[i], this.gravity);
      vec3.scaleAndAdd(this.acc[i], this.acc[i], this.normals[i], vec3.dot(this.normals[i], this.windForce));
    }
    console.log(this.acc[0]);

    for (let i = 0; i < this.edges.length; i++) {
      let u = this.edges[i][0], v = this.edges[i][1], l = this.edges[i][2];
      let e = [], diff = [];
      let invM = 1.0 * this.rows * this.cols / MASS;
      vec3.sub(e, this.positions[u], this.positions[v]);
      //if (vec3.length(e) < 1e-6 * this.width / (this.cols - 1)) {
      //    continue;
      //}
      vec3.scale(diff, e, (l - vec3.length(e)) / vec3.length(e));
      vec3.scaleAndAdd(this.acc[u], this.acc[u], diff, HOOKE * invM);
      vec3.scaleAndAdd(this.acc[v], this.acc[v], diff, -HOOKE * invM);
    }

    this.t += DT;

    let fullPositions = [];
    let fullNormals = [];
    let fullElements = [];
    let fullIndexInTriangle = [];

    for (let i = 0; i < this.triangles.length; i++) {
      let u = this.triangles[i][0], v = this.triangles[i][1], w = this.triangles[i][2];
      fullElements.push(6 * i, 6 * i + 1, 6 * i + 2, 6 * i + 3, 6 * i + 4, 6 * i + 5);
      //fullElements.push(3 * i, 3 * i + 1, 3 * i + 2);
      fullPositions.push(this.positions[u], this.positions[v], this.positions[w]);
      let back = [], eps = 1e-1;
      vec3.scaleAndAdd(back, this.positions[u], this.normals[u], -eps);
      fullPositions.push(back);
      vec3.scaleAndAdd(back, this.positions[w], this.normals[w], -eps);
      fullPositions.push(back);
      vec3.scaleAndAdd(back, this.positions[v], this.normals[v], -eps);
      fullPositions.push(back);
      fullNormals.push(this.normals[u], this.normals[v], this.normals[w]);
      let neg = [];
      vec3.scale(neg, this.normals[u], -1.0);
      fullNormals.push(neg);
      vec3.scale(neg, this.normals[w], -1.0);
      fullNormals.push(neg);
      vec3.scale(neg, this.normals[v], -1.0);
      fullNormals.push(neg);
      fullIndexInTriangle.push(0, 1, 2, 0, 1, 2);
      //fullIndexInTriangle.push(0, 1, 2);
    }
    return {
      "elements": fullElements,
      attributes: {
        "position": fullPositions,
        "normal": fullNormals,
        "indexInTriangle": fullIndexInTriangle,
      },
    };
  }
}