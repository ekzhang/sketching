const fs = require("fs");
const CSG = require("./csg");

var a = CSG.cube({ radius: 0.75 });
var b = CSG.sphere({ radius: 1, slices: 64, stacks: 32 });
var c = CSG.cylinder({ radius: 0.5, slices: 32 });
var d = CSG.cylinder({
  radius: 0.5,
  slices: 32,
  start: [-1, 0, 0],
  end: [1, 0, 0],
});
var e = CSG.cylinder({
  radius: 0.5,
  slices: 32,
  start: [0, 0, -1],
  end: [0, 0, 1],
});
var m = a.intersect(b).subtract(c).subtract(d).subtract(e);
polys = m.toPolygons();

console.log("Number of polygons:", polys.length);

const vertices = [];
const faces = [];
for (const poly of polys) {
  const face = [];
  for (const v of poly.vertices) {
    vertices.push(v.pos);
    face.push(vertices.length);
  }
  faces.push(face);
}

vv = vertices.map(({ x, y, z }) => `v ${x} ${y} ${z}\n`).join("");
ff = faces.map((arr) => "f " + arr.join(" ") + "\n").join("");

fs.writeFileSync("../models/csg.obj", vv + ff);
