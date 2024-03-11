// theme.ts

// 1. import `extendTheme` function
import { extendTheme, type ThemeConfig, StyleFunctionProps } from '@chakra-ui/react'
import { mode } from "@chakra-ui/theme-tools"

// 2. Add your color mode config
const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
}

// 3. extend the theme
const theme = extendTheme({ 
	config,
	styles : {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: mode('gray.100', 'gray.800')(props),
      },
    }),
  },
})

export default theme
