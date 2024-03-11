import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'
import { visualizer } from "rollup-plugin-visualizer";
import { splitVendorChunkPlugin } from 'vite'
import obfuscator from 'rollup-plugin-obfuscator';


// https://vitejs.dev/config/
export default defineConfig({
  base: '/daily',
  server: {
    proxy: {
      "/daily/api": {
        target: 'http://localhost:13200',
        changeOrigin: true,
      },
    },
  },
  plugins: [
	react(),
	TanStackRouterVite(),
	splitVendorChunkPlugin(),
	visualizer({
      open: true,
    }),
	obfuscator({
      global:false,
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        rotateUnicodeArray: true,
        deadCodeInjection: false,
        // deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        domainLock: [],
        identifierNamesGenerator: "hexadecimal",
        identifiersPrefix: "",
        inputFileName: "",
        log: true,
        renameGlobals: true,
        reservedNames: [],
        reservedStrings: [],
        seed: 0,
        selfDefending: true,
        sourceMap: false,
        sourceMapBaseUrl: "",
        sourceMapFileName: "",
        sourceMapMode: "separate",
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        target: "browser",
        transformObjectKeys: true,
        unicodeEscapeSequence: true,

        domainLockRedirectUrl: "about:blank",
        forceTransformStrings: [],
        identifierNamesCache: null,
        identifiersDictionary: [],
        ignoreImports: true,
        optionsPreset: "default",
        renameProperties: false,
        renamePropertiesMode: "safe",
        sourceMapSourcesMode: "sources-content",
       
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
       
        stringArrayIndexesType: ["hexadecimal-number"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: "variable",
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@interfaces': path.resolve(__dirname, 'src/interfaces'),
      '@routes': path.resolve(__dirname, 'src/routes'),
    },
  },
})
