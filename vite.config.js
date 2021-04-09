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
        sketching: resolve(__dirname, "sketching/index.html"),
      },
    },
  },
};

export default config;
