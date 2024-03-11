import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    AlertDialogProps,
    Button,
} from '@chakra-ui/react'

interface AlertProps extends AlertDialogProps {
    title: string
    body: string
    onConfirm: () => void
}

export default function Alert({ title, body, onConfirm, onClose, ...rest }: AlertProps) {
    return (
        <AlertDialog onClose={onClose} {...rest}>
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                        {title}
                    </AlertDialogHeader>

                    <AlertDialogBody>
                        {body}
                    </AlertDialogBody>

                    <AlertDialogFooter>
                        <Button onClick={onClose}>
                            取消
                        </Button>
                        <Button colorScheme='red' onClick={onConfirm} ml={3}>
                            确认
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog >
    )
}
