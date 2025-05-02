
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
    const x = this.currentFrame * this.frameWidth;
    this.ctx.clearRect(0, 0, this.frameWidth, this.frameHeight);
    this.ctx.drawImage(this.img, x, 0, this.frameWidth, this.frameHeight, 0, 0, this.frameWidth, this.frameHeight);
  }
}
