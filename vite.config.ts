import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'
import { visualizer } from "rollup-plugin-visualizer";
import { splitVendorChunkPlugin } from 'vite'
import obfuscator from 'rollup-plugin-obfuscator';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import envCompatible from 'vite-plugin-env-compatible';

const version: string = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')).version;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/daily',
    server: {
      proxy: {
        "/daily/api": {
          target: env.AUTOPCR_SERVER_HOST || 'http://localhost:13200',
          changeOrigin: true,
        },
      },
      host: env.AUTOPCR_WEBUI_LISTEN || 'localhost'
    },
    define: {
      'APP_VERSION': JSON.stringify(version),
    },
    plugins: [
      react(),
      TanStackRouterVite(),
      splitVendorChunkPlugin(),
      visualizer({
        open: true,
      }),
      envCompatible({
        mountedPath: 'process.env',
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
	build: {
		target: 'es2020',         
		sourcemap: false,        
		brotliSize: true,
		rollupOptions: {
		  output: {
			manualChunks(id) {
			  if (id.includes('node_modules')) {
				if (id.includes('@chakra-ui')) return 'chakra'
				if (id.includes('framer-motion')) return 'motion'
				if (id.includes('xlsx')) return 'xlsx'
				return 'vendor'
			  }
			}
		  }
		}
	},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@api': path.resolve(__dirname, 'src/api'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@interfaces': path.resolve(__dirname, 'src/interfaces'),
        '@routes': path.resolve(__dirname, 'src/routes'),
      },
    },
  }
})
