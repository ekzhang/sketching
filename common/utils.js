export function saveImage(filepath, imageData) {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  canvas.width = imageData.width;
  canvas.height = imageData.height;
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

export function loadImage(url) {
  const img = document.createElement("img");
  img.src = url;
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
  });
}
