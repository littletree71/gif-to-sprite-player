<template>
  <div class="gif-to-sprite">
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
    />
    <div v-if="spritesheetReady" class="controls">
      <button @click="play">▶️ 播放</button>
      <button @click="pause">⏸ 暫停</button>
      <button @click="reset">🔄 重置</button>
      <button @click="speedDown">⏬ 減速</button>
      <button @click="speedUp">⏫ 加速</button>
      <button @click="download">📥 下載 SpriteSheet</button>
      <div>FPS: {{ fps }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { parseGIF, decompressFrames } from 'gifuct-js'
import { SpritePlayer } from '@/utils/SpritePlayer'

const props = defineProps<{ src: string, debug: bool }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const playCanvas = ref<HTMLCanvasElement | null>(null)
const player = ref<SpritePlayer | null>(null)

const fps = ref(12)
const frameWidth = ref(0)
const frameHeight = ref(0)
const frameCount = ref(0)
const spritesheetReady = ref(false)
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
            const imgData = new ImageData(prevPatch, frameWidth, frameHeight)
            ctx.putImageData(imgData, i * frameWidth, 0)
          }
          return
        }
      }

      // 更新前一幀
      prevPatch = currentPatch

      // 繪製 sprite sheet
      const imgData = new ImageData(new Uint8ClampedArray(currentPatch), frameWidth, frameHeight)
      ctx.putImageData(imgData, i * frameWidth, 0)
    } catch (error) {
      console.error(`Error processing frame ${i}:`, error)
    }
  })
  if(props.debug) console.log(frames);
  spriteDataURL = canvas.toDataURL()

  setupPlayer()
})

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
}
function pause() {
  player.value?.pause()
}
function reset() {
  player.value?.reset()
}
function speedUp() {
  fps.value += 2
  player.value?.setSpeed(fps.value)
}
function speedDown() {
  fps.value = Math.max(1, fps.value - 2)
  player.value?.setSpeed(fps.value)
}
function download() {
  const link = document.createElement('a')
  link.download = 'spritesheet.png'
  link.href = spriteDataURL
  link.click()
}
</script>

<style scoped>
.controls {
  margin-top: 10px;
}
button {
  margin: 4px;
}
</style>
