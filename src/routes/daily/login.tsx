import {
    Box,
    ClientOnly,
    Flex,
    Heading,
    IconButton,
    Image,
} from '@chakra-ui/react'
import { LuMoon, LuSun } from 'react-icons/lu'

import LoginWithPasswordComponent from "@components/Login/LoginWithPasswordComponent"
import { Skeleton } from '../../components/ui/skeleton'
import autopcr from "@/assets/autopcr.svg"
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { keyframes } from '@emotion/react'
import { useColorMode } from '../../components/ui/color-mode'
import { API } from '@api/APIUtils'
import axios from 'axios'
import { Route as AccountRoute } from '@routes/daily/_sidebar/account/index'

export const Route = createFileRoute('/daily/login')({
    component: LoginComponent,
    // 已登录时登录页没有意义，直接送去账号主页
    beforeLoad: async () => {
        try {
            await API.get('/account', { skipErrorHandler: true, skipAuthRedirect: true })
            throw redirect({ to: AccountRoute.to })
        } catch (e) {
            if (isRedirect(e)) throw e
            // 401/未授权：确实是未登录，留在登录页
            if (axios.isAxiosError(e) && e.response?.status === 401) return
            // 网络故障等非授权错误：放行进入应用，让页面自身的 401 拦截器兜底，避免弱网被静默扣在登录页
            throw redirect({ to: AccountRoute.to })
        }
    },
})

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0.3; }
`

export function LoginComponent() {
    const { toggleColorMode, colorMode } = useColorMode()

    return (
        <Flex
            h="100vh"
            align="center"
            justify="center"
            bg="bg.canvas"
            position="relative"
            overflow="hidden"
            p={{ base: 0, md: 4 }}
        >
            {/* Ambient Background Blobs */}
            <Box
                position="absolute"
                top="-10%"
                left="-10%"
                w="500px"
                h="500px"
                bg="blue.500"
                filter="blur(120px)"
                opacity="0.2"
                rounded="full"
                animation={`${pulse} 15s infinite ease-in-out`}
            />
            <Box
                position="absolute"
                bottom="-10%"
                right="-10%"
                w="500px"
                h="500px"
                bg="purple.500"
                filter="blur(120px)"
                opacity="0.2"
                rounded="full"
                animation={`${pulse} 20s infinite ease-in-out reverse`}
            />

            {/* Theme Toggle */}
            <Box position="absolute" top={4} right={4} zIndex={10}>
                <ClientOnly fallback={<Skeleton w="10" h="10" />}>
                    <IconButton
                        variant="ghost"
                        aria-label="Toggle color mode"
                        onClick={toggleColorMode}
                        size="lg"
                        css={{ color: "fg.muted", _hover: { color: "fg", bg: "bg.subtle" } }}
                    >
                        {colorMode === 'light' ? <LuMoon /> : <LuSun />}
                    </IconButton>
                </ClientOnly>
            </Box>

            {/* Main Card */}
            <Flex
                w="full"
                maxW="4xl"
                h={{ base: "full", md: "auto" }}
                maxH={{ md: "80vh" }}
                bg="bg.panel"
                rounded={{ base: "none", md: "3xl" }}
                shadow={{ base: "none", md: "xl" }}
                overflow="hidden"
                flexDir={{ base: "column", md: "row" }}
                zIndex={1}
                borderWidth={{ base: "0px", md: "1px" }}
                borderColor="border.subtle"
            >
                {/* Left Side: Branding - Minimalist Apple Style */}
                <Flex
                    flex="1"
                    bg="bg.subtle"
                    p={{ base: 8, md: 12 }}
                    flexDir="column"
                    justify="center"
                    align="center"
                    borderRightWidth={{ md: "1px" }}
                    borderBottomWidth={{ base: "1px", md: "0" }}
                    borderColor="border.subtle"
                    display={{ base: "none", md: "flex" }}
                    position="relative"
                >
                    {/* Subtle aesthetic circle to reduce emptiness */}
                    <Box
                        position="absolute"
                        w="80%"
                        h="80%"
                        rounded="full"
                        bgGradient="radial(circle, bg.canvas, transparent)"
                        opacity="0.6"
                        filter="blur(40px)"
                    />
                    
                    <Image 
                        src={autopcr} 
                        alt="autopcr" 
                        w="240px"
                        maxW="60%"
                        h="auto"
                        objectFit="contain"
                        zIndex={1}
                        css={{ _dark: { filter: "brightness(0) invert(1)" } }}
                        animation={`${float} 6s ease-in-out infinite`}
                    />
                </Flex>

                {/* Right Side: Login Form */}
                <Flex 
                    flex="1" 
                    p={{ base: 6, md: 8, lg: 10 }} 
                    flexDir="column" 
                    justify="center"
                    overflowY="auto"
                >
                    <Flex justify="center" mb={6} display={{ base: "flex", md: "none" }}>
                         <Image src={autopcr} alt="autopcr" h="48px" css={{ _dark: { filter: "brightness(0) invert(1)" } }} />
                    </Flex>
                    
                    <Box mb={8} textAlign={{ base: "center", md: "left" }}>
                        <Heading size="2xl" mb={2}>欢迎回来</Heading>
                    </Box>

                    <Box w="full">
                        <LoginWithPasswordComponent />
                    </Box>
                    
                </Flex>
            </Flex>
        </Flex>
    )
}
