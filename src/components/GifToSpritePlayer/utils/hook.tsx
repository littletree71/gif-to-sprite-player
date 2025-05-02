import { nextTick, ref, Ref } from "vue";
import { SpritePlayer } from "@/components/GifToSpritePlayer/utils/SpritePlayer";
import panzoom from "@panzoom/panzoom";
import { decompressFrames, parseGIF } from "gifuct-js";

declare global {
  interface HTMLCanvasElement {
    zoomPlayer?: SpritePlayer | null;
    player?: SpritePlayer | null;
  }
}

export function useGifToSpritePlayer({
  spriteCanvas,
  playCanvas,
  zoomCanvas,
  fps,
  frameWidth,
  frameHeight,
  frameCount,
  spritesheetReady,
  isZoomed,
  isHovered,
  props,
}: {
  spriteCanvas: Ref<HTMLCanvasElement | null>;
  playCanvas: Ref<HTMLCanvasElement | null>;
  zoomCanvas: Ref<HTMLCanvasElement | null>;
  fps: Ref<number>;
  frameWidth: Ref<number>;
  frameHeight: Ref<number>;
  frameCount: Ref<number>;
  spritesheetReady: Ref<boolean>;
  isZoomed: Ref<boolean>;
  isHovered: Ref<boolean>;
  props: {
    src: string;
    debug?: boolean;
    zoomPercentage?: number;
    fps?: number;
  };
}) {
  const isPlaying = ref(false); // 播放狀態
  const zoomPercentage = ref(props.zoomPercentage || 85);
  const player = ref<SpritePlayer | null>(null);
  let spriteDataURL = "";

  /**
   * @description: initialize the sprite sheet and player
   */
  async function mount() {
    // 預設 zoomPercentage 為 85%
    const res = await fetch(props.src);
    const buffer = await res.arrayBuffer();
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);

    frameWidth.value = frames[0].dims.width;
    frameHeight.value = frames[0].dims.height;
    frameCount.value = frames.length;

    spritesheetReady.value = true; // 觸發條件渲染

    await nextTick(); // 等待 DOM 更新完成

    const canvas = spriteCanvas.value!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = frameWidth.value * frameCount.value;
    canvas.height = frameHeight.value;

    let prevPatch: Uint8ClampedArray | null = null;

    frames.forEach((frame, i) => {
      try {
        const frameWidth = frame.dims.width;
        const frameHeight = frame.dims.height;
        const currentPixels = frame.pixels;
        const currentPatch = new Uint8ClampedArray(frame.patch);

        let isNegative = false;
        if (prevPatch) {
          let totalDiff = 0;
          for (let j = 0; j < currentPatch.length; j++) {
            totalDiff += Math.abs(currentPatch[j] - prevPatch[j]);
          }
          const avgDiff = totalDiff / currentPatch.length;

          let negativeCount = 0;
          let currentBrightness = 0;
          let prevBrightness = 0;
          for (let j = 0; j < currentPixels.length; j += 4) {
            const currentRed = currentPixels[j];
            const currentGreen = currentPixels[j + 1];
            const currentBlue = currentPixels[j + 2];

            const prevRed = prevPatch[j];
            const prevGreen = prevPatch[j + 1];
            const prevBlue = prevPatch[j + 2];

            // 計算像素差異（RGB 平均差異）
            const diffRed = Math.abs(currentRed - prevRed);
            const diffGreen = Math.abs(currentGreen - prevGreen);
            const diffBlue = Math.abs(currentBlue - prevBlue);

            // 檢查是否接近負片效果（RGB 通道都符合負片條件）
            if (
              Math.abs(currentRed + prevRed - 255) < 50 &&
              Math.abs(currentGreen + prevGreen - 255) < 50 &&
              Math.abs(currentBlue + prevBlue - 255) < 50
            ) {
              negativeCount++;
            }

            // 計算亮度（加權平均法）
            const currentPixelBrightness =
              0.299 * currentRed + 0.587 * currentGreen + 0.114 * currentBlue;
            const prevPixelBrightness =
              0.299 * prevRed + 0.587 * prevGreen + 0.114 * prevBlue;
            currentBrightness += currentPixelBrightness;
            prevBrightness += prevPixelBrightness;
          }

          const negativeRatio = negativeCount / (currentPixels.length / 3); // 負片像素比例
          const brightnessDiff =
            Math.abs(currentBrightness - prevBrightness) /
            (currentPixels.length / 3); // 平均亮度差異

          // 顯示調試資訊
          if (props.debug)
            console.log(
              `Frame ${i} - Avg Diff: ${avgDiff}, Negative Ratio: ${negativeRatio}, Brightness Diff: ${brightnessDiff}`
            );

          // 判斷是否為負片幀
          if (negativeRatio > 0.2) {
            isNegative = true;
            console.warn(
              `⚠️ Frame ${i} detected as negative frame and will be skipped.`
            );
            if (prevPatch) {
              const imgData = new ImageData(prevPatch, frameWidth, frameHeight);
              ctx.putImageData(imgData, i * frameWidth, 0);
            }
            return;
          }
        }

        // 更新前一幀
        prevPatch = currentPatch;

        // 繪製 sprite sheet
        const imgData = new ImageData(
          new Uint8ClampedArray(currentPatch),
          frameWidth,
          frameHeight
        );
        ctx.putImageData(imgData, i * frameWidth, 0);
      } catch (error) {
        console.error(`Error processing frame ${i}:`, error);
      }
    });
    if (props.debug) console.log(frames);
    spriteDataURL = canvas.toDataURL();

    const playCanvasEl = playCanvas.value as HTMLCanvasElement;
    player.value = new SpritePlayer({
      canvas: playCanvasEl,
      src: spriteDataURL,
      frameWidth: frameWidth.value,
      frameHeight: frameHeight.value,
      frameCount: frameCount.value,
      frameRate: fps.value,
      loop: true,
    });

    play();
  }

  function play() {
    player.value?.play();
    isPlaying.value = true;
    if (isZoomed.value) {
      zoomCanvas.value?.zoomPlayer?.play();
    }
  }

  function pause() {
    player.value?.pause();
    isPlaying.value = false;
    if (isZoomed.value) {
      zoomCanvas.value?.zoomPlayer?.pause();
    }
  }

  function togglePlayPause() {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  function reset() {
    player.value?.reset();
    if (isZoomed.value) {
      zoomCanvas.value?.zoomPlayer?.reset();
    }
  }

  function speedUp() {
    fps.value += 2;
    player.value?.setSpeed(fps.value);
    if (isZoomed.value) {
      zoomCanvas.value?.zoomPlayer?.setSpeed(fps.value);
    }
  }

  function speedDown() {
    fps.value = Math.max(1, fps.value - 2);
    player.value?.setSpeed(fps.value);
    if (isZoomed.value) {
      zoomCanvas.value?.zoomPlayer?.setSpeed(fps.value);
    }
  }

  function download(type: "gif" | "png") {
    const link = document.createElement("a");

    const fileNameWithExtension =
      props.src.split("/").pop()?.split("?")[0] || "file";
    const fileName = fileNameWithExtension.replace(/\.[^/.]+$/, ""); // 移除副檔名

    if (type === "gif") {
      // 下載原始 GIF
      link.download = `${fileName}.gif`;
      link.href = props.src; // 使用原始 GIF 的 URL
    } else if (type === "png") {
      // 下載生成的 Sprite PNG
      link.download = `${fileName}-spritesheet.png`;
      link.href = spriteDataURL; // 使用生成的 Sprite PNG 的 Data URL
    }

    link.click();
  }

  /**
   * @description: toggle zoom canvas
   */
  async function toggleZoom(event?: MouseEvent) {
    if (event && event.target === zoomCanvas.value) {
      event.stopPropagation();
      return;
    }

    isZoomed.value = !isZoomed.value;
    if (isZoomed.value) {
      await nextTick();
      const playCanvasEl = playCanvas.value as HTMLCanvasElement;
      const zoomCanvasEl = zoomCanvas.value as HTMLCanvasElement;

      if (playCanvasEl && zoomCanvasEl && player.value) {
        // 計算放大倍率
        const screenWidth = (window.innerWidth * zoomPercentage.value) / 100;
        const screenHeight = (window.innerHeight * zoomPercentage.value) / 100;
        const zoomScale = Math.min(
          screenWidth / frameWidth.value,
          screenHeight / frameHeight.value
        );

        // 設定 zoomCanvas 的寬高
        zoomCanvasEl.width = frameWidth.value * zoomScale;
        zoomCanvasEl.height = frameHeight.value * zoomScale;

        // 初始化 zoomCanvas 的 SpritePlayer
        const zoomPlayer = new SpritePlayer({
          canvas: zoomCanvasEl,
          src: spriteDataURL,
          frameWidth: frameWidth.value,
          frameHeight: frameHeight.value,
          frameCount: frameCount.value,
          frameRate: fps.value,
          loop: true,
        });

        // 同步當前幀數
        zoomPlayer.setCurrentFrame(player.value.getCurrentFrame());

        // 播放放大的內容
        if (isPlaying.value) {
          zoomPlayer.play();
        }

        // 保存 zoomPlayer 實例，方便後續操作
        zoomCanvasEl.zoomPlayer = zoomPlayer;
        // 初始化 Panzoom
        const panzoomInstance = panzoom(zoomCanvasEl, {
          maxScale: 5, // 最大縮放比例
          minScale: 0.1, // 最小縮放比例
        });

        // 綁定滾輪縮放事件
        zoomCanvasEl.parentElement?.addEventListener(
          "wheel",
          panzoomInstance.zoomWithWheel
        );
      }
    } else {
      // 停止並清理 zoomCanvas 的 SpritePlayer
      const zoomCanvasEl = zoomCanvas.value;
      if (zoomCanvasEl?.zoomPlayer) {
        zoomCanvasEl.zoomPlayer.pause();
        zoomCanvasEl.zoomPlayer = null;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (isZoomed.value && event.key === "Escape") {
      isZoomed.value = false; // 關閉放大視圖
    }

    // 只有當滑鼠懸停時，處理以下按鍵
    if (isHovered.value || isZoomed.value) {
      switch (event.key.toLowerCase()) {
        case " ": // 空格鍵播放/暫停
          event.preventDefault(); // 防止頁面滾動
          togglePlayPause();
          break;
        case "r": // R 鍵重置
          reset();
          break;
        case "z": // Z 鍵放大
          toggleZoom();
          break;
        case "arrowleft": // 左方向鍵減速
          speedDown();
          break;
        case "arrowright": // 左方向鍵減速
          speedUp();
          break;
      }
    }
  }
  return {
    play,
    pause,
    togglePlayPause,
    reset,
    speedUp,
    speedDown,
    toggleZoom,
    download,
    handleKeyDown,
    mount,
  };
}
