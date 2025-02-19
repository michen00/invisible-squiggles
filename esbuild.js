const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("\x1b[34m[watch]\x1b[0m Build started..."); // Blue color
    });

    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error("\x1b[31m✘ Build failed with errors:\x1b[0m"); // Red color
        result.errors.forEach(({ text, location }) => {
          console.error(`✘ [ERROR] ${text}`);
          console.error(`    ${location.file}:${location.line}:${location.column}`);
        });
      } else {
        console.log("\x1b[32m✔ Build completed successfully\x1b[0m"); // Green color
      }

      if (result.warnings.length > 0) {
        console.warn("\x1b[33m⚠ Warnings:\x1b[0m"); // Yellow color
        result.warnings.forEach(({ text, location }) => {
          console.warn(`⚠ [WARNING] ${text}`);
          if (location) {
            console.warn(`    ${location.file}:${location.line}:${location.column}`);
          }
        });
      }
    });
  },
};

async function main() {
  try {
    const ctx = await esbuild.context({
      entryPoints: ["src/extension.ts"],
      bundle: true,
      format: "cjs",
      minify: production,
      sourcemap: !production,
      sourcesContent: false,
      platform: "node",
      outfile: "dist/extension.js",
      external: ["vscode"],
      logLevel: "silent",
      plugins: [
        /* add to the end of plugins array */
        esbuildProblemMatcherPlugin,
      ],
    });

    if (watch) {
      console.log("\x1b[36m[watch]\x1b[0m Watching for changes..."); // Cyan color
      await ctx.watch();

      // Cleanup on process termination
      process.on("SIGINT", async () => {
        console.log("\n\x1b[31m[watch]\x1b[0m Stopping build..."); // Red color
        await ctx.dispose();
        process.exit(0);
      });
    } else {
      await ctx.rebuild();
      await ctx.dispose();
    }
  } catch (e) {
    console.error("\x1b[31m[ERROR]\x1b[0m", e);
    process.exit(1);
  }
}

main();

