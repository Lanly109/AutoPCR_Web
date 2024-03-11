import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Image,
    Text,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";

interface ModalProps {
    alias: string
    result: string
    resultUrl: string
}

const resultModal = NiceModal.create(({ alias, result, resultUrl }: ModalProps) => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size="full" closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{alias}的日常报告</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    {resultUrl &&
                        <Image src={resultUrl} alt='result_image' />
                    }
                    {result &&
                        <Text> {result} </Text>
                    }
                </ModalBody>

            </ModalContent>
        </Modal>
    )
})

export default resultModal;
