# GIF to Sprite Player

A Vue 3 component for converting GIFs into sprite sheets and playing them efficiently. This component supports features like zooming, playback controls, and downloading the sprite sheet or original GIF.

![](./public/demo.gif)

## Features

- Convert GIFs into sprite sheets for optimized playback.
- Play, pause, reset, and control playback speed.
- Zoom functionality with pan and zoom controls.
- Download the sprite sheet as a PNG or the original GIF.
- Debug mode for analyzing frame data.

## Installation

Install the package using npm or yarn:

```bash
npm install gif-to-sprite-player
# or
yarn add gif-to-sprite-player
```

## Usage

Import and use the component in your Vue 3 project:

```vue
<template>
  <GifToSpritePlayer src="/path-to-your-gif.gif" :debug="true" :fps="30" />
</template>

<script setup lang="ts">
import GifToSpritePlayer from "gif-to-sprite-player";
</script>
```

### Props

| Prop             | Type    | Default | Description                              |
| ---------------- | ------- | ------- | ---------------------------------------- |
| `src`            | String  | -       | The source URL of the GIF.               |
| `debug`          | Boolean | `false` | Enable debug mode to log frame data.     |
| `zoomPercentage` | Number  | `85`    | The zoom percentage for the zoomed view. |
| `fps`            | Number  | `24`    | Frames per second for playback.          |

## Development

To run the project locally:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Build

To build the library for production:

```bash
npm run build
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

### Third-Party Licenses

This project includes dependencies licensed under MIT, BSD, ISC, and Apache-2.0. See [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md) for more information.
