import {
    Box,
    BoxProps,
    Flex,
    FlexProps,
} from '@chakra-ui/react'

import { TocItem } from './Area'

interface SidebarProps extends BoxProps {
    tocList: TocItem[]
    onNavigate?: () => void
}

export default function Toc({ tocList, onNavigate, ...rest }: SidebarProps) {

    return (
        <Box
            bg="bg.panel"
            borderRight="1px"
            borderColor="border.subtle"
            overflow="scroll"
            {...rest}>
            {
                tocList.map((item, index) => {
                    return (
                        <NavItem key={index} module_id={item.id} onNavigate={onNavigate}>
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
    onNavigate?: () => void
}
const NavItem = ({ module_id, onNavigate, children, ...rest }: NavItemProps) => {
    return (
        <Box
            as="a"
            // @ts-ignore
            href={`#${module_id}`}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
                e.preventDefault();
                document.querySelector(`#${module_id}`)?.scrollIntoView({
                    behavior: "smooth"
                });
                onNavigate?.();
            }}>
            <Flex
                align="center"
                p="2"
                mx="2"
                borderRadius="lg"
                role="group"
                cursor="pointer"
                _hover={{
                    bg: 'brand.500',
                    color: 'black',
                }}
                {...rest}>
                {children}
            </Flex>
        </Box>
    )
}
