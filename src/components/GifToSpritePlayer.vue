<template>
  <div 
    class="gif-to-sprite"
    @mouseenter="isHovered = true" 
    @mouseleave="isHovered = false"
  >
    <canvas
      v-show="!spritesheetReady || debug"
      ref="canvasRef"
      :width="frameWidth * frameCount"
      :height="frameHeight"
      style="display: none"
    />
    <canvas
      v-show="spritesheetReady"
      ref="playCanvas"
      :width="frameWidth"
      :height="frameHeight"
      @click="togglePlayPause"
      @dblclick="toggleZoom"
      style="cursor: pointer"
    />
    <div class="fps-display">FPS: {{ fps }}</div>
    <div class="controls">
      <button @click="toggleZoom" title="zoom (z)">🔎</button>
      <button @click="speedDown" title="speed down (←)">⏪</button>
      <button @click="togglePlayPause" title="play/pause (space)">⏯️</button>
      <button @click="speedUp" title="speed up (→)">⏩</button>
      <button @click="reset" title="reset (r)">🔄</button>
      <button @click="download" title="download">💾</button>
    </div>

    <!-- Zoom Overlay -->
    <div v-if="isZoomed" class="zoom-overlay" @click="toggleZoom">
      <canvas ref="zoomCanvas"
        :width="frameWidth * 2"
        :height="frameHeight * 2"
        @mousedown.stop
        @mouseup.stop
      >
      </canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { parseGIF, decompressFrames } from 'gifuct-js'
import { SpritePlayer } from '@/utils/SpritePlayer'
import panzoom from '@panzoom/panzoom';

const props = defineProps<{ src: string, debug: boolean }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const playCanvas = ref<HTMLCanvasElement | null>(null)
const zoomCanvas = ref<HTMLCanvasElement | null>(null)
const player = ref<SpritePlayer | null>(null)

const fps = ref(12)
const frameWidth = ref(0)
const frameHeight = ref(0)
const frameCount = ref(0)
const spritesheetReady = ref(false)
const isPlaying = ref(false) // 播放狀態
const isZoomed = ref(false) // 放大狀態
const isHovered = ref(false);
let spriteDataURL = ''

onMounted(async () => {
  const res = await fetch(props.src)
  const buffer = await res.arrayBuffer()
  const gif = parseGIF(buffer)
  const frames = decompressFrames(gif, true)

  frameWidth.value = frames[0].dims.width
  frameHeight.value = frames[0].dims.height
  frameCount.value = frames.length

  spritesheetReady.value = true // 觸發條件渲染

  await nextTick() // 等待 DOM 更新完成

  const canvas = canvasRef.value!
  const ctx = canvas.getContext('2d')!
  canvas.width = frameWidth.value * frameCount.value
  canvas.height = frameHeight.value

  let prevPatch: Uint8ClampedArray | null = null
  
  frames.forEach((frame, i) => {
    try {
      const frameWidth = frame.dims.width
      const frameHeight = frame.dims.height
      const currentPixels = frame.pixels
      const currentPatch = new Uint8ClampedArray(frame.patch)

      let isNegative = false

      if (prevPatch) {
        let totalDiff = 0
        for (let j = 0; j < currentPatch.length; j++) {
          totalDiff += Math.abs(currentPatch[j] - prevPatch[j])
        }
        const avgDiff = totalDiff / currentPatch.length
        
        let negativeCount = 0
        let currentBrightness = 0
        let prevBrightness = 0
        for (let j = 0; j < currentPixels.length; j += 4) {
          const currentRed = currentPixels[j]
          const currentGreen = currentPixels[j + 1]
          const currentBlue = currentPixels[j + 2]

          const prevRed = prevPatch[j]
          const prevGreen = prevPatch[j + 1]
          const prevBlue = prevPatch[j + 2]

          // 計算像素差異（RGB 平均差異）
          const diffRed = Math.abs(currentRed - prevRed)
          const diffGreen = Math.abs(currentGreen - prevGreen)
          const diffBlue = Math.abs(currentBlue - prevBlue)

          // 檢查是否接近負片效果（RGB 通道都符合負片條件）
          if (
            Math.abs(currentRed + prevRed - 255) < 50 &&
            Math.abs(currentGreen + prevGreen - 255) < 50 &&
            Math.abs(currentBlue + prevBlue - 255) < 50
          ) {
            negativeCount++
          }

          // 計算亮度（加權平均法）
          const currentPixelBrightness = 0.299 * currentRed + 0.587 * currentGreen + 0.114 * currentBlue
          const prevPixelBrightness = 0.299 * prevRed + 0.587 * prevGreen + 0.114 * prevBlue
          currentBrightness += currentPixelBrightness
          prevBrightness += prevPixelBrightness
        }

        const negativeRatio = negativeCount / (currentPixels.length / 3) // 負片像素比例
        const brightnessDiff = Math.abs(currentBrightness - prevBrightness) / (currentPixels.length / 3) // 平均亮度差異

        // 顯示調試資訊
        if(props.debug) console.log(`Frame ${i} - Avg Diff: ${avgDiff}, Negative Ratio: ${negativeRatio}, Brightness Diff: ${brightnessDiff}`);
        
        // 判斷是否為負片幀
        if (negativeRatio > 0.2 ) {
          isNegative = true
          console.warn(`⚠️ Frame ${i} detected as negative frame and will be skipped.`)
          if (prevPatch) {
            const imgData = new ImageData(prevPatch, frameWidth, frameHeight);
            ctx.putImageData(imgData, i * frameWidth, 0);
          }
          return
        }
      }

      // 更新前一幀
      prevPatch = currentPatch;

      // 繪製 sprite sheet
      const imgData = new ImageData(new Uint8ClampedArray(currentPatch), frameWidth, frameHeight);
      ctx.putImageData(imgData, i * frameWidth, 0);
    } catch (error) {
      console.error(`Error processing frame ${i}:`, error);
    }
  })
  if(props.debug) console.log(frames);
  spriteDataURL = canvas.toDataURL();

  setupPlayer();
  play();
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

function handleKeyDown(event: KeyboardEvent) {
  if (isZoomed.value && event.key === 'Escape') {
    isZoomed.value = false; // 關閉放大視圖
  }
  
   // 只有當滑鼠懸停時，處理以下按鍵
   if (isHovered.value) {
    switch (event.key.toLowerCase()) {
      case ' ': // 空格鍵播放/暫停
        event.preventDefault(); // 防止頁面滾動
        togglePlayPause();
        break;
      case 'r': // R 鍵重置
        reset();
        break;
      case 'z': // Z 鍵放大
        toggleZoom();
        break;
      case 'arrowleft': // 左方向鍵減速
        speedDown();
        break;
      case 'arrowright': // 左方向鍵減速
        speedUp();
        break;  
    }
  }
}

function setupPlayer() {
  const canvas = playCanvas.value!
  player.value = new SpritePlayer({
    canvas,
    src: spriteDataURL,
    frameWidth: frameWidth.value,
    frameHeight: frameHeight.value,
    frameCount: frameCount.value,
    frameRate: fps.value,
    loop: true,
  })
}

function play() {
  player.value?.play()
  isPlaying.value = true
  if (isZoomed.value) {
    zoomCanvas.value?.zoomPlayer?.play()
  }
}
function pause() {
  player.value?.pause()
  isPlaying.value = false
  if (isZoomed.value) {
    zoomCanvas.value?.zoomPlayer?.pause()
  }
}
function togglePlayPause() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}
function reset() {
  player.value?.reset()
}
function speedUp() {
  fps.value += 2
  player.value?.setSpeed(fps.value)
  if (isZoomed.value) {
    zoomCanvas.value?.zoomPlayer?.setSpeed(fps.value);
    
  }
}
function speedDown() {
  fps.value = Math.max(1, fps.value - 2)
  player.value?.setSpeed(fps.value)
  if (isZoomed.value) {
    zoomCanvas.value?.zoomPlayer?.setSpeed(fps.value);
  }
}
function download() {
  const link = document.createElement('a')
  link.download = 'spritesheet.png'
  link.href = spriteDataURL
  link.click()
}
async function toggleZoom(event?: MouseEvent) {
  if (event && event.target === zoomCanvas.value) {
    event.stopPropagation();
    return;
  }

  isZoomed.value = !isZoomed.value;
  if (isZoomed.value) {
    await nextTick();
    const playCanvasEl = playCanvas.value;
    const zoomCanvasEl = zoomCanvas.value;

    if (playCanvasEl && zoomCanvasEl && player.value) {
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
        minScale: 1, // 最小縮放比例
      });

      // 綁定滾輪縮放事件
      zoomCanvasEl.parentElement?.addEventListener('wheel', panzoomInstance.zoomWithWheel);
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
</script>

<style scoped>
.gif-to-sprite {
  position: relative;
  display: inline-block;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 5px;
  border-radius: 8px;
}
.controls button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  margin: 0 5px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.controls,
.fps-display {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.gif-to-sprite:hover .controls,
.gif-to-sprite:hover .fps-display {
  opacity: 1;
}

.fps-display {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 14px;
}

.zoom-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.zoom-overlay canvas {
  width: auto; /* 確保不拉伸 */
  height: auto;
  max-width: 100%;
  max-height: 100%;
  border: 2px solid white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  cursor: pointer;
}
</style>
