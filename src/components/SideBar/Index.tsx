import {
    Box,
    Flex,
    HStack,
    Icon,
    useColorModeValue,
    FlexProps,
    // Button,
    // Stack,
    useColorMode,
    Image,
    createStandaloneToast,
    useTheme,
    Text,
    useBreakpointValue,
    IconButton,
    Tooltip,
} from '@chakra-ui/react'
import {
    FiHome,
    FiUsers,
    FiCompass,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { postLogout } from '@api/Login'
import { Route as LoginRoute } from "@routes/daily/login";
import { Route as InfoRoute } from "@routes/daily/_sidebar/account/index";
import { Route as UsersRoute } from "@routes/daily/_sidebar/user/index";
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import autopcr from "@/assets/autopcr.svg"
import { AxiosError } from 'axios'
import {useEffect} from 'react'
import { ValidateResponse } from '@/interfaces/Account'
import {useUserRole} from "@api/Account.ts";

interface NavItemProps extends FlexProps {
    icon?: IconType
    children: React.ReactNode
    href?: string
}

const NavItem = ({ icon, children, href, ...rest }: NavItemProps) => {
    const isSmallScreen = useBreakpointValue({ base: true, md: false });

    return (
        <Box
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}>
            <Link to={href}>
                <Tooltip label={isSmallScreen ? children : undefined}>
                    <Flex
                        align="center"
                        p={isSmallScreen ? "2" : "4"}
                        mx={isSmallScreen ? "1" : "4"}
                        borderRadius="lg"
                        role="group"
                        cursor="pointer"
                        _hover={{
                            bg: 'cyan.400',
                            color: 'white',
                        }}
                        {...rest}>
                        {icon && (
                            <Icon
                                mr={isSmallScreen ? "0" : "4"}
                                fontSize="16"
                                _groupHover={{
                                    color: 'white',
                                }}
                                as={icon}
                            />
                        )}
                        {!isSmallScreen && children}
                    </Flex>
                </Tooltip>
            </Link>
        </Box>
    )
}

export default function Nav() {
    const { colorMode, toggleColorMode } = useColorMode()
    const theme = useTheme();
    const { toast } = createStandaloneToast({ theme });
    const role = useUserRole();
    const isSmallScreen = useBreakpointValue({ base: true, md: false });

    const navigate = useNavigate();

    useEffect(() => {
        const eventSource = new EventSource('/daily/api/query_validate');

        eventSource.onmessage = function(event) {
            const res: ValidateResponse = JSON.parse(event.data as string) as ValidateResponse;
            if (res.status !== 'ok') {
                window.open(res.url, '_blank');
            }
        };

        eventSource.onerror = function(err) {
            console.error('Error receiving SSE', err);
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const handleLogout = () => {
        postLogout().then(async (res) => {
            toast({ title: "登出成功", description: res, status: "success" });
            await navigate({ to: LoginRoute.to });
        }).catch((err: AxiosError) => {
            toast({ title: "登出失败", description: err.response?.data as string, status: "error" });
        })
    }

    return (
        <Flex flexDirection={'column'} height={'100vh'}>
            <Box top={0} left={0} right={0} zIndex={10} bg={useColorModeValue('gray.200', 'gray.900')} px={2}>
                <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                    <Box>
                        <Link to={InfoRoute.to}>
                            <Image src={autopcr} alt="autopcr" style={{ width: "40px", height: "40px" }} />
                        </Link>
                    </Box>
                    <HStack as={'nav'} spacing={isSmallScreen ? 1 : 4}>
                        <NavItem key="dashboard" href={InfoRoute.to} icon={FiHome} >
                            一览
                        </NavItem>
                        {role?.admin && <NavItem key="user" href={UsersRoute.to} icon={FiUsers}>
                            用户管理
                        </NavItem>}
                        <NavItem key="logout" icon={FiCompass} onClick={handleLogout}>
                            登出
                        </NavItem>
                    </HStack>
                    <Flex alignItems={'center'}>
                        <IconButton
                            aria-label="Toggle color mode"
                            icon={colorMode === 'light' ? <SunIcon /> : <MoonIcon />}
                            onClick={toggleColorMode}
                            size={isSmallScreen ? "sm" : "md"}
                        />
                    </Flex>
                </Flex>
            </Box>

            <Flex p={4} flex={1} overflow={'auto'} flexDirection={'column'}>
                <Outlet />
            </Flex>

            <Box position="fixed" bottom={0} left={0} right={0} zIndex={10} bg={useColorModeValue('gray.200', 'gray.900')} px={4} textAlign='right'>
                <Text fontSize="sm" color="gray.500">
                    Powered by <a href="https://github.com/cc004/autopcr">AutoPCR</a> <a href="https://github.com/Lanly109/AutoPCR_Web">AutoPCR_Web</a>：{APP_VERSION}
                </Text>
            </Box>
        </Flex>
    )
}