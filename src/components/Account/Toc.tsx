import {
    Box,
    Flex,
    useColorModeValue,
    BoxProps,
    FlexProps,
} from '@chakra-ui/react'
import { TocItem } from './Area'

interface SidebarProps extends BoxProps {
    tocList: TocItem[]
}

export default function Toc({ tocList, ...rest }: SidebarProps) {

    return (
        <Box
            bg={useColorModeValue('gray.50', 'gray.900')}
            borderRight="1px"
            borderRightColor={useColorModeValue('gray.200', 'gray.700')}
            overflow="scroll"
            {...rest}>
            {
                tocList.map((item, index) => {
                    return (
                        <NavItem key={index} module_id={item.id}>
                            {item.name}
                        </NavItem>
                    )
                })
            }
        </Box>
    )
}

interface NavItemProps extends FlexProps {
    module_id: string
}
const NavItem = ({ module_id, children, ...rest }: NavItemProps) => {
    return (
        <Box
            as="a"
            href={`#${module_id}`}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            onClick={(e) => {
                e.preventDefault();
                document.querySelector(`#${module_id}`)?.scrollIntoView({
                    behavior: "smooth"
                });
            }}>
            <Flex
                align="center"
                p="2"
                mx="2"
                borderRadius="lg"
                role="group"
                cursor="pointer"
                _hover={{
                    bg: 'cyan.400',
                    color: 'white',
                }}
                {...rest}>
                {children}
            </Flex>
        </Box>
    )
}
