import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'; // 判斷是否為元件庫模式

  return {
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
    build: isLib
      ? {
          lib: {
            entry: path.resolve(__dirname, "src/components/GifToSpritePlayer/index.ts"),
            name: "GifToSpritePlayer",
            fileName: (format) => `gif-to-sprite-player.${format}.js`,
          },
          rollupOptions: {
            external: ["vue"],
            output: {
              globals: {
                vue: "Vue",
              },
            },
          },
          outDir: 'dist/lib',
        }
      : {
          outDir: "dist/app", // 應用程式輸出目錄
        },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});