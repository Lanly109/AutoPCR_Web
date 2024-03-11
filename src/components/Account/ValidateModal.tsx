import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react'

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import Validate from './Validate';

interface ValidateModalProps {
    alias: string;
    id: string;
    userid: string;
    gt: string;
    challenge: string;
}

const ValidateModal = NiceModal.create(({ alias, id, userid, gt, challenge }: ValidateModalProps) => {
    const modal = useModal();
    return (
        <Modal closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{alias}验证码</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Validate id={id} userid={userid} gt={gt} challenge={challenge} onClose={modal.hide} />
                </ModalBody>

            </ModalContent>
        </Modal>
    )
})

export default ValidateModal;

