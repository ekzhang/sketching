export function saveImage(imageData) {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  canvas.width = this.width;
  canvas.height = this.height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL();
  canvas.remove();
  const textureLink = document.createElement("a");
  textureLink.download = filepath;
  textureLink.href = dataUrl;
  document.body.appendChild(textureLink);
  textureLink.click();
  textureLink.remove();
}
