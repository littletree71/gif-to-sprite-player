import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : 'public',
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: 'LICENSE', dest: '' },
        { src: 'README.md', dest: '' },
        { src: 'THIRD_PARTY_LICENSES.md', dest: '' }, // 若有
      ],
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/components/GifToSpritePlayer/index.ts"),
      name: "GifToSpritePlayer",
      fileName: (format) => `gif-to-sprite-player.${format}.js`,
    },
    rollupOptions: {
      external: ["vue"], // 不打包 Vue，作為外部依賴
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(new URL('.', import.meta.url).pathname, 'src')
    }
  }
}))