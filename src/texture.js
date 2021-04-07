export function generatePencilTextures(numTextures, width, height) {
  const paper = new Paper(width, height);
  const textures = new Uint8ClampedArray(4 * width * height * numTextures);
  let index = 0;
  for (let i = 0; i < numTextures; i++) {
    paper.drawTexture(i / numTextures);
    for (let j = 0; j < width * height; j++) {
      const value = paper.data[j];
      textures[index++] = value;
      textures[index++] = value;
      textures[index++] = value;
      textures[index++] = 0xff;
    }
    paper.clear();
  }
  return new ImageData(textures, width, height * numTextures);
}

//for debugging purposes
export function displayImageData(imgData) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  ctx.canvas.width = imgData.width;
  ctx.canvas.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
  let img = document.createElement("img");
  img.src = canvas.toDataURL("image/png");
  document.body.appendChild(img);
}

class Paper {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.thickness = 0.5;
    this.mu_b = 0.1;
    this.data = new Uint8ClampedArray(width * height);
    this.total = 0;
    this.clear();
  }

  clear() {
    for (let i = 0; i < this.width * this.height; i++) {
      this.data[i] = 0xff;
    }
    this.total = 0;
  }

  fromWH(w, h) {
    const h_new = ((h % this.height) + this.height) % this.height;
    const w_new = ((w % this.width) + this.width) % this.width;
    return h_new * this.width + w_new;
  }

  drawPixel(w, h, pressure) {
    const pos = this.fromWH(w, h);
    const oldValue = this.data[pos];
    let intermediateValue = oldValue * pressure;
    if (oldValue > 220) {
      intermediateValue *= 0.5;
    }
    const newValue = Math.round(oldValue - this.mu_b * intermediateValue);
    this.data[pos] = newValue;
    this.total += oldValue - newValue;
  }

  drawPoint(w, h, pressure) {
    const w_low = Math.round(w - this.thickness - 1);
    const w_high = Math.round(w + this.thickness + 1);
    const h_low = Math.round(h - this.thickness - 1);
    const h_high = Math.round(h + this.thickness + 1);
    for (let w_nxt = w_low; w_nxt <= w_high; w_nxt++) {
      for (let h_nxt = h_low; h_nxt <= h_high; h_nxt++) {
        const dist = Math.sqrt(Math.pow(w - w_nxt, 2) + Math.pow(h - h_nxt, 2));
        if (dist > this.thickness) {
          continue;
        }
        const distFactor =
          Math.sqrt(1 - dist / this.thickness) * Math.pow(Math.random(), 2);
        this.drawPixel(w_nxt, h_nxt, pressure * distFactor);
      }
    }
  }

  drawStroke(pressure) {
    const numSteps = this.width * 1.6;
    const stepSize = 0.5;

    let w = Math.random() * this.width;
    let h = Math.random() * this.height;

    for (let i = 0; i < numSteps; i++) {
      const dw = 1 + 0.04 * Math.random();
      const dh = 0.04 * Math.random();
      w += stepSize * dw;
      h += stepSize * dh;
      this.drawPoint(w, h, pressure);
    }
  }

  drawTexture(darkness) {
    let weight = darkness * darkness;
    let maxNumStrokes = Math.pow(1 / this.thickness, 2) * 100 * this.height;
    if (weight < 0.3) {
      maxNumStrokes = weight * (1.0 / 0.3) * maxNumStrokes;
      weight = 0.3;
    }
    let targetTotal = 255.0 * darkness * this.width * this.height;
    for (let i = 0; i < maxNumStrokes; i++) {
      this.drawStroke(weight);
      if (this.total >= targetTotal) {
        break;
      }
    }
    //console.log(this.total, targetTotal);
  }
}
