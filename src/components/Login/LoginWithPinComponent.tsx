import {
    Box,
    HStack,
    Text,
    Code,
    Stack,
    Button,
    useColorModeValue,
    useClipboard,
    PinInput,
    PinInputField
} from '@chakra-ui/react'
import { getLoginPin } from '@api/Login';
import { useState } from 'react';

export default function LoginWithPinComponent() {

    const { onCopy, value, setValue, hasCopied } = useClipboard("");
    const [pin, setPin] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const generatePin = () => {
        setLoading(true);
        getLoginPin().then((res) => {
            console.log(res);
            setValue("#login " + res);
            setPin(res);
            setLoading(false);
        }).catch((err) => {
            console.log(err);
            setLoading(false);
            console.log(err);
        });
    };

    return (
        <Box
            rounded={'lg'}
            bg={useColorModeValue('white', 'gray.700')}
            boxShadow={'lg'}
            p={8}>

            {!pin || !value ? <Button onClick={generatePin} isLoading={loading} >生成PIN码</Button> :
                <Stack spacing={4}>
                    <Text> 请于60s内在相应Q群发送</Text>
                    <Code> #login xxxx </Code>
                    <HStack spacing={4}>
                        <PinInput isDisabled value={pin}>
                            <PinInputField />
                            <PinInputField />
                            <PinInputField />
                            <PinInputField />
                        </PinInput>
                    </HStack>
                    <Button onClick={onCopy}>{hasCopied ? "Copied!" : "Copy"}</Button>
                </Stack>
            }
        </Box>
    )
}
