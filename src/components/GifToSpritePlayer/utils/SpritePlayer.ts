export class SpritePlayer {
  private ctx: CanvasRenderingContext2D;
  private img: HTMLImageElement;
  private frameWidth: number;
  private frameHeight: number;
  private frameCount: number;
  private frameRate: number;
  private currentFrame = 0;
  private isPlaying = false;
  private loop: boolean;
  private lastTime = 0;

  constructor(options: {
    canvas: HTMLCanvasElement;
    src: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    frameRate?: number;
    loop?: boolean;
  }) {
    const { canvas, src, frameWidth, frameHeight, frameCount, frameRate = 24, loop = true } = options;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameCount = frameCount;
    this.frameRate = frameRate;
    this.loop = loop;
    this.img = new Image();
    this.img.src = src;
    this.img.onload = () => this.drawFrame();
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.loopFrame();
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.currentFrame = 0;
    this.drawFrame();
  }

  setSpeed(fps: number) {
    this.frameRate = Math.max(1, fps);
  }

  setCurrentFrame(frame: number) {
    this.currentFrame = frame % this.frameCount; // 確保幀數不超過範圍
    this.drawFrame();
  }

  getCurrentFrame() {
    return this.currentFrame;
  }

  private loopFrame() {
    if (!this.isPlaying) return;
    const now = performance.now();
    const elapsed = now - this.lastTime;
    if (elapsed > 1000 / this.frameRate) {
      this.currentFrame++;
      if (this.currentFrame >= this.frameCount) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.isPlaying = false;
          return;
        }
      }
      this.lastTime = now;
      this.drawFrame();
    }
    requestAnimationFrame(() => this.loopFrame());
  }

  private drawFrame() {
    const sx = this.currentFrame * this.frameWidth;
    const sy = 0;
    const sw = this.frameWidth;
    const sh = this.frameHeight;
    const dx = 0;
    const dy = 0;
    const dw = this.frameWidth;
    const dh = this.frameHeight;

    // 清空畫布
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // 放大繪製
    this.ctx.save();
    const scaleFactor = this.ctx.canvas.width / this.frameWidth; // 計算放大比例
    this.ctx.scale(scaleFactor, scaleFactor);
    this.ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
    this.ctx.restore();
  }
}
export interface SpritePlayerOptions {
  canvas: HTMLCanvasElement;
  src: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameRate?: number;
  loop?: boolean;
}