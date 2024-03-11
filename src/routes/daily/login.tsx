import {
    Card,
    CardBody,
    CardHeader,
    Flex,
    Image,
    useColorMode,
    useColorModeValue,
} from '@chakra-ui/react'

import {
    createFileRoute,
} from '@tanstack/react-router'
import LoginWithPasswordComponent from "@components/Login/LoginWithPasswordComponent"
import autopcr from "@/autopcr.svg"

export const Route = createFileRoute('/daily/login')({
    component: LoginComponent,
})

export function LoginComponent() {
    const { toggleColorMode } = useColorMode()
    return (
        <Flex
            height="100vh"
            align={'center'}
            justify={'center'}
            bg={useColorModeValue('gray.100', 'gray.800')}>
            <Card>
                <CardHeader>
                    <Image onClick={toggleColorMode} src={autopcr} alt="autopcr" />
                </CardHeader>
                <CardBody>
                    <LoginWithPasswordComponent />
                </CardBody>
            </Card>
        </Flex>
    )
}
