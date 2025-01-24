import {
    Box,
    Flex,
    HStack,
    Icon,
    useColorModeValue,
    FlexProps,
    Button,
    Stack,
    useColorMode,
    Image,
    createStandaloneToast,
    useTheme,
    Text,
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
import {useEffect, useState} from 'react'
import { ValidateResponse } from '@/interfaces/Account'
import {RoleInfo} from "@interfaces/UserInfo.ts";
import {getRole} from "@api/Account.ts";

interface NavItemProps extends FlexProps {
    icon?: IconType
    children: React.ReactNode
    href?: string
}

const NavItem = ({ icon, children, href, ...rest }: NavItemProps) => {
    return (
        <Box
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}>
            <Link to={href}>
                <Flex
                    align="center"
                    p="4"
                    mx="4"
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
                            mr="4"
                            fontSize="16"
                            _groupHover={{
                                color: 'white',
                            }}
                            as={icon}
                        />
                    )}
                    {children}
                </Flex>
            </Link>
        </Box>
    )
}

export default function Nav() {
    const { colorMode, toggleColorMode } = useColorMode()
    const theme = useTheme();
    const { toast } = createStandaloneToast({ theme });
    const [role, setRole] = useState<RoleInfo>();

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

    useEffect(() => {
        getRole().then((res) => {
            setRole(res);
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: err?.response?.data as string || '网络错误' });
        });
    }, []);

    const handleLogout = () => {
        postLogout().then(async (res) => {
            toast({ title: "登出成功", description: res, status: "success", position: "top-right" });
            await navigate({ to: LoginRoute.to });
        }).catch((err: AxiosError) => {
            toast({ title: "登出失败", description: err.response?.data as string, status: "error", position: "top-right" });
        })
    }

    return (
        <Flex flexDirection={'column'} height={'100vh'}>
            <Box top={0} left={0} right={0} zIndex={10} bg={useColorModeValue('gray.200', 'gray.900')} px={4}>
                <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                    <Box>
                        <Link to={InfoRoute.to}>
                            <Image src={autopcr} alt="autopcr" style={{ width: "50px", height: "50px" }} />
                        </Link>
                    </Box>
                    <HStack as={'nav'} spacing={4}>
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
                        <Stack direction={'row'} spacing={7}>
                            <Button onClick={toggleColorMode}>
                                {colorMode === 'light' ? <SunIcon /> : <MoonIcon />}
                            </Button>

                        </Stack>
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
