
<template>
  <div class="gif-to-sprite">
    <canvas
      v-if="spritesheetReady"
      ref="canvasRef"
      :width="frameWidth * frameCount"
      :height="frameHeight"
      style="display: none"
    />
    <canvas
      v-if="spritesheetReady"
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

const props = defineProps<{ src: string }>()

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

  const canvas = canvasRef.value!
  const ctx = canvas.getContext('2d')!
  canvas.width = frameWidth.value * frameCount.value
  canvas.height = frameHeight.value

  frames.forEach((frame, i) => {
    const imgData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frameWidth.value,
      frameHeight.value
    )
    ctx.putImageData(imgData, i * frameWidth.value, 0)
  })

  spriteDataURL = canvas.toDataURL()
  spritesheetReady.value = true

  await nextTick()
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
