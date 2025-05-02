<template>
  <div id="app">
    <h1>🎞 GIF to Sprite Player</h1>
    <GifToSpritePlayer src="/sample.gif" debug="true" />
  </div>
</template>

<script setup lang="ts">
import GifToSpritePlayer from './components/GifToSpritePlayer.vue'
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  padding: 2rem;
}
</style>