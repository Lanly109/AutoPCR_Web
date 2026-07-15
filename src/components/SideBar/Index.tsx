import {
    Box,
    Button,
    Flex,
    FlexProps,
    HStack,
    Icon,
    Image,
    Text,
    useBreakpointValue,
} from '@chakra-ui/react'
import {
    FiCompass,
    FiHome,
    FiUsers,
} from 'react-icons/fi'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LuMoon, LuSun } from 'react-icons/lu'
import { useColorMode } from '../ui/color-mode'

import { IconType } from 'react-icons'
import { Route as InfoRoute } from "@routes/daily/_sidebar/account/index";
import { Route as LoginRoute } from "@routes/daily/login";
import { Tooltip } from '../../components/ui/tooltip'
import { Route as UsersRoute } from "@routes/daily/_sidebar/user/index";
import { ValidateResponse } from '@/interfaces/Account'
import autopcr from "@/assets/autopcr.svg"
import { postLogout } from '@api/Login'
import { toaster } from '../../components/ui/toaster'
import {useEffect} from 'react'
import {useUserRole} from "@api/Account.ts";
import RunningStatus from '../Account/RunningStatus';

interface NavItemProps extends FlexProps {
    icon?: IconType
    children: React.ReactNode
    href?: string
}

const NavItem = ({ icon, children, href, onClick, ...rest }: NavItemProps) => {
    const isSmallScreen = useBreakpointValue({ base: true, md: false });

    const content = (
        <Flex
            align="center"
            py={2}
            px={3}
            borderRadius="full"
            role="group"
            cursor="pointer"
            transition="all 0.2s"
            color="fg.muted"
            _hover={{
                bg: 'bg.subtle',
                color: 'fg',
                transform: 'translateY(-1px)'
            }}
            onClick={onClick}
            {...rest}>
            {icon && (
                <Icon
                    mr={isSmallScreen ? "0" : "2"}
                    fontSize="18"
                    as={icon}
                />
            )}
            {!isSmallScreen && <Text fontSize="sm" fontWeight="medium">{children}</Text>}
        </Flex>
    );

    if (href) {
        return (
            <Link 
                to={href} 
                activeProps={{ 
                    style: { 
                        fontWeight: "bold",
                        backgroundColor: "var(--chakra-colors-sidebar-active-bg)",
                        color: "var(--chakra-colors-sidebar-active-fg)",
                    } 
                }}
                style={{ textDecoration: 'none' }}
            >
                {/* Need to override color for active state manually as activeProps style applies to the 'a' tag */}
                 <Tooltip content={isSmallScreen ? children : undefined}>
                    {content}
                 </Tooltip>
            </Link>
        )
    }

    return (
        <Tooltip content={isSmallScreen ? children : undefined}>
            {content}
        </Tooltip>
    )
}

export default function Nav() {
    const { colorMode, toggleColorMode } = useColorMode()
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

    const handleLogout = async () => {
        try {
            const res = await postLogout();
            toaster.create({ title: "登出成功", description: res, type: "success" });
            await navigate({ to: LoginRoute.to });
        } catch {
            // Error is handled globally
        }
    }

    return (
        <Flex flexDirection={'column'} height={'100vh'} bg="bg.canvas">
            <Box top={0} left={0} right={0} zIndex={20} bg="transparent" px={4} py={0}>
                <Flex h={14} alignItems={'center'} justifyContent={'space-between'}>
                    <Box>
                        <Link to={InfoRoute.to}>
                            <Image src={autopcr} alt="autopcr" h="32px" w="auto" objectFit="contain" />
                        </Link>
                    </Box>
                    <HStack as={'nav'} gap={isSmallScreen ? 1 : 4}>
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
                    <Flex alignItems={'center'} gap={2}>
                        <RunningStatus />
                        <Button
                            aria-label="Toggle color mode"
                            onClick={toggleColorMode}
                            size={isSmallScreen ? "sm" : "md"}
                            px={0}
                            variant="ghost"
                            colorPalette="brand"
                        >
                            {colorMode === 'light' ? <LuSun /> : <LuMoon />}
                        </Button>
                    </Flex>
                </Flex>
            </Box>

            <Flex p={4} flex={1} overflow={'auto'} flexDirection={'column'} zIndex={1}>
                <Outlet />
            </Flex>

            <Box py={0} pb={2} bg="transparent" px={4} textAlign='right'>
                <Text fontSize="xs" color="fg.muted">
                    Powered by <a href="https://github.com/cc004/autopcr" target="_blank" rel="noreferrer">AutoPCR</a> & <a href="https://github.com/Lanly109/AutoPCR_Web" target="_blank" rel="noreferrer">AutoPCR_Web</a> · {APP_VERSION}
                </Text>
            </Box>
        </Flex>
    )
}
