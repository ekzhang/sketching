export function generateTextures(num_textures, width, height, show){
    for(let i = 0; i < num_textures; i++){
        let canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.id = "texture" + i.toString();
        if(!show){
            canvas.style.display = "none";
        }
        generateTexture(i/num_textures, canvas, width, height, "texture" + i.toString());
    }
}

class Paper{
    constructor(canvas, width, height, thickness){
        //http://jsfiddle.net/andrewjbaker/Fnx2w/
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')
        this.ctx.canvas.width = width;
        this.ctx.canvas.height = height;
        this.width = width;
        this.height = height;
        this.imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    
        this.buf = new ArrayBuffer(this.imageData.data.length);
        this.buf8 = new Uint8ClampedArray(this.buf);
        this.data = new Uint32Array(this.buf);
            
        this.data[1] = 0x0a0b0c0d;
        this.littleEndianness = !(this.buf[4] === 0x0a && this.buf[5] === 0x0b &&
            this.buf[6] === 0x0c && this.buf[7] === 0x0d);
        
        for(let i = 0; i < this.width * this.height; i++){
            this.data[i] = 0xffffffff;
        }
        
        this.thickness = thickness;
        this.mu_b = 0.3;
    }

    fromWH(w, h){
        const h_new = (h % this.height + this.height) % this.height;
        const w_new = (w % this.width + this.width) % this.width;
        return h_new * this.width + w_new;
    }

    getPixel(w, h){
        if(this.littleEndianness){
            const a = (this.data[this.fromWH(w, h)] >> 24);
            const b = (this.data[this.fromWH(w, h)] >> 16) & 0xFF;
            const g = (this.data[this.fromWH(w, h)] >> 8) & 0xFF;
            const r = (this.data[this.fromWH(w, h)]) & 0xFF;
            return [r, g, b, a];
        }
        else{
            const r = (this.data[this.fromWH(w, h)] >> 24);
            const g = (this.data[this.fromWH(w, h)] >> 16) & 0xFF;
            const b = (this.data[this.fromWH(w, h)] >> 8) & 0xFF;
            const a = (this.data[this.fromWH(w, h)]) & 0xFF;
            return [r, g, b, a];
        }
    }
    
    setPixel(r, g, b, a, w, h){
        if(this.littleEndianness){
            this.data[this.fromWH(w, h)] = (a << 24) | (b << 16) | (g << 8) | (r);
        }
        else{
            this.data[this.fromWH(w, h)] = (r << 24) | (g << 16) | (b << 8) | (a);
        }
    }
    
    drawPixel(pressure, w, h){
        const [r, g, b, a] = this.getPixel(w, h);
        const oldValue = Math.round((r+g+b)/3);
        let intermediateValue = oldValue * pressure;
        if(oldValue > 220){
            intermediateValue *= 0.5;
        }
        const newValue = Math.round(oldValue - this.mu_b * intermediateValue);
        //console.log(oldValue, intermediateValue, newValue);
        this.setPixel(newValue, newValue, newValue, 255, w, h);
    }
    
    drawPoint(pressure, w, h){
        const w_low = Math.round(w - this.thickness - 1);
        const w_high = Math.round(w + this.thickness + 1);
        const h_low = Math.round(h - this.thickness - 1);
        const h_high = Math.round(h + this.thickness + 1);
        for(let w_nxt = w_low; w_nxt <= w_high; w_nxt++){
            for(let h_nxt = h_low; h_nxt <= h_high; h_nxt++){
                const dist = Math.sqrt(Math.pow(w-w_nxt, 2) + Math.pow(h-h_nxt, 2));
                if(dist > this.thickness){
                    continue;
                }
                const distFactor = Math.sqrt(1 - dist / this.thickness) * Math.random();
                this.drawPixel(pressure * distFactor, w_nxt, h_nxt);
            }
        }
    }

    getDirection(w, h){
        return [1 + 0.04 * Math.random(), 0 + 0.04 * Math.random()];
    }
    
    drawStroke(pressure){
        const numSteps = this.width * 1.6;
        const stepSize = 0.5;

        let w = Math.random() * this.width;
        let h = Math.random() * this.height;


        for(let i = 0; i < numSteps; i++){
            const [dw, dh] = this.getDirection(w, h);
            w += stepSize * dw;
            h += stepSize * dh;
            this.drawPoint(pressure, w, h);
        }
    }

    setCanvas(){
        this.imageData.data.set(this.buf8);
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    saveCanvas(filepath){
        //https://stackoverflow.com/questions/37859069/how-to-change-save-image-to-file-default-name
        let textureLink = document.createElement("a");
        textureLink.download = filepath;
        document.body.appendChild(textureLink);
        let dataURL = this.canvas.toDataURL();
        textureLink.href=dataURL;
        textureLink.click();
        textureLink.style.display = "none";
    }
}

function generateTexture(s, canvas, width, height, filepath){
    let paper = new Paper(canvas, width, height, 0.5);
    s = s * s;
    let numStrokes = 6000;
    let weight = s;
    if(weight < 0.3){
        numStrokes = s * (1.0/0.3) * 6000;
    }
    if(weight < 0.3){
        weight = 0.3;
    }
    for(let i = 0; i < numStrokes; i++){
        paper.drawStroke(weight);
    }
    paper.setCanvas();
    //paper.saveCanvas(filepath);
}