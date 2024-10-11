import { ResultInfo as ResultInfoInterface } from '@interfaces/UserInfo';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { ResultInfo } from "./ResultInfo"

interface ModalProps {
    alias: string
    title: string
    resultInfo: ResultInfoInterface[]
}

const resultModal = NiceModal.create(({ alias, title, resultInfo }: ModalProps) => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size="full" closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{alias}的{title}结果</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <ResultInfo resultInfo={resultInfo} />
                </ModalBody>

            </ModalContent>
        </Modal>
    )
})

export default resultModal;
