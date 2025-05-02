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
  </div>
  <!-- Zoom Overlay -->
  <div v-if="isZoomed" class="zoom-overlay" @click="toggleZoom">
    <canvas ref="zoomCanvas" @mousedown.stop @mouseup.stop> </canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useGifToSpritePlayer } from "./utils/hook";
import { SpritePlayer } from "@/components/GifToSpritePlayer/utils/SpritePlayer";
import "./GifToSpritePlayer.styles.css";

const props = defineProps<{
  src: string;
  debug?: boolean;
  zoomPercentage?: number;
  fps?: number;
}>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const playCanvas = ref<HTMLCanvasElement | null>(null);
const zoomCanvas = ref<HTMLCanvasElement | null>(null);

const fps = ref(props.fps || 24);
const frameWidth = ref(0);
const frameHeight = ref(0);
const frameCount = ref(0);
const spritesheetReady = ref(false);

const isZoomed = ref(false); // 放大狀態
const isHovered = ref(false);

const {
  mount,
  togglePlayPause,
  reset,
  speedUp,
  speedDown,
  toggleZoom,
  download,
  handleKeyDown,
} = useGifToSpritePlayer({
  canvasRef,
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
});

onMounted(async () => {
  mount();
});

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>
