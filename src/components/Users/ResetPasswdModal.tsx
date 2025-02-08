import {
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Stack,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { SubmitHandler, useForm } from 'react-hook-form';


interface ResetPasswdModal {
    password: string
    passwordRepeat: string
}

const resetPasswdModal = NiceModal.create(() => {
    const modal = useModal();
    const {
        handleSubmit,
        register,
        watch,
        formState: { isSubmitting, errors },
    } = useForm<ResetPasswdModal>()
    const password = watch("password");
    const handleResetPassword: SubmitHandler<ResetPasswdModal> = (values) => {
        modal.resolve(values.password);
    };
    return (
        <Modal closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>重置密码</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <form onSubmit={handleSubmit(handleResetPassword)}>
                        <Stack spacing={4}>
                            <FormControl isInvalid={!!errors.password}>
                                <FormLabel>输入新密码</FormLabel>
                                <Input type='password'
                                    placeholder='5位以上'
                                    {...register("password", {
                                        required: "请输入密码",
                                        minLength: { value: 5, message: "密码长度至少 5 位" },
                                    })} />
                                <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={!!errors.passwordRepeat}>
                                <FormLabel>再次输入新密码</FormLabel>
                                <Input
                                    type="password"
                                    placeholder='与上面一致'
                                    {...register("passwordRepeat", {
                                        required: "请确认密码",
                                        validate: (value) => value === password || "两次输入的密码不一致",
                                    })}
                                />
                                <FormErrorMessage>{errors.passwordRepeat?.message}</FormErrorMessage>
                            </FormControl>
                            <Button
                                bg={'blue.400'}
                                color={'white'}
                                _hover={{
                                    bg: 'blue.500',
                                }}
                                isLoading={isSubmitting} type='submit'
                            >
                                重置密码
                            </Button>
                        </Stack>
                    </form>
                </ModalBody>
            </ModalContent>
        </Modal >
    )
})

export default resetPasswdModal;
