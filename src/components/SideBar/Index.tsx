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
} from '@chakra-ui/react'
import {
    FiHome,
    FiCompass,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { postLogout } from '@api/Login'
import { Route as LoginRoute } from "@routes/daily/login";
import { Route as InfoRoute } from "@routes/daily/_sidebar/account/index";
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import autopcr from "@/autopcr.svg"
import { AxiosError } from 'axios'

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

    const navigate = useNavigate();

    const handleLogout = () => {
        postLogout().then(async (res) => {
            toast({ title: "登出成功", description: res, status: "success", position: "top-right" });
            await navigate({ to: LoginRoute.to });
        }).catch((err: AxiosError) => {
            toast({ title: "登出失败", description: err.response?.data as string, status: "error", position: "top-right" });
        })
    }

    return (
        <>
            <Box position="fixed" top={0} left={0} right={0} zIndex={10} bg={useColorModeValue('gray.200', 'gray.900')} px={4}>
                <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                    <Box>
                        <Image src={autopcr} alt="autopcr" style={{ width: "50px", height: "50px" }} />
                    </Box>
                    <HStack as={'nav'} spacing={4}>
                        <NavItem key="dashboard" href={InfoRoute.to} icon={FiHome} >
                            一览
                        </NavItem>
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

            <Box p={4} marginTop={16}>
                <Outlet />
            </Box>
        </>
    )
}
