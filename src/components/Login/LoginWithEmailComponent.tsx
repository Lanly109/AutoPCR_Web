import { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Stack,
  Button,
  useColorModeValue,
  Center,
  PinInput,
  PinInputField,
  HStack,
} from '@chakra-ui/react';

export default function LoginWithEmailComponent() {
  const [showPinInput, setShowPinInput] = useState(false);

  const handleQQSubmit = () => {
    // 在这里触发发送验证码的逻辑
    // 然后显示验证码输入框
    setShowPinInput(true);
  };

  return (
    <Box
      rounded={'lg'}
      bg={useColorModeValue('white', 'gray.700')}
      boxShadow={'lg'}
      p={8}>
      <Stack spacing={4}>
        <FormControl id="qq">
          <FormLabel>QQ</FormLabel>
          <Input type="email" />
        </FormControl>
        {showPinInput && (
          <FormControl id="pin">
            <FormLabel>验证码</FormLabel>
            <Center>
              <HStack>
                <PinInput>
                  <PinInputField />
                  <PinInputField />
                  <PinInputField />
                  <PinInputField />
                </PinInput>
              </HStack>
            </Center>
          </FormControl>
        )}
        <Stack spacing={10}>
          <Stack
            direction={{ base: 'column', sm: 'row' }}
            align={'start'}
            justify={'space-between'}>
            <Checkbox>记住我</Checkbox>
          </Stack>
          <Button
            onClick={handleQQSubmit}
            bg={'blue.400'}
            color={'white'}
            _hover={{
              bg: 'blue.500',
            }}>
            {showPinInput ? '提交验证码' : '获取验证码'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
