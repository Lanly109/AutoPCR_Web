import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
} from '../../components/ui/modal'
import NiceModal, { useModal } from "@ebay/nice-modal-react";

import { ResultInfo } from "./ResultInfo"
import { ResultInfo as ResultInfoInterface } from '@interfaces/UserInfo';

interface ModalProps {
    alias: string
    title: string
    resultInfo: ResultInfoInterface[]
}

const resultModal = NiceModal.create(({ alias, title, resultInfo }: ModalProps) => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size="full" closeOnOverlayClick={false} isOpen={modal.visible} onClose={async () => { modal.resolve(); await modal.hide(); }}>
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
