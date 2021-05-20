import { resolve } from "path";

/**
 * @type {import('vite').UserConfig}
 */
const config = {
  build: {
    minify: "esbuild",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        mesh: resolve(__dirname, "mesh/index.html"),
        sdf: resolve(__dirname, "sdf/index.html"),
        realtime: resolve(__dirname, "realtime/index.html"),
      },
    },
  },
};

export default config;
