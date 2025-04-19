import { Candidate, ConfigValue } from "@interfaces/Module";
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
    Button, Input, Flex, Box, Text, useColorModeValue
} from "@chakra-ui/react";
import { useState } from "react";
import NiceModal, { useModal } from "@ebay/nice-modal-react";

interface MultiSelectModalProps {
    candidates: Candidate[];
    value: ConfigValue[];
}

const multiSelectModal = NiceModal.create(({ candidates, value }: MultiSelectModalProps) => {
    const modal = useModal();
    const bg = useColorModeValue("gray.50", "gray.700");

    const [selectedUnits, setSelectedUnits] = useState<ConfigValue[]>(value);
    const [availableUnits, setAvailableUnits] = useState<Candidate[]>(candidates.filter(u => !value.includes(u.value)));
    const [searchAllText, setSearchAllText] = useState("");
    const [searchSelectedText, setSearchSelectedText] = useState("");

    const handleAdd = (id: ConfigValue) => {
        if (!selectedUnits.includes(id)) {
            setSelectedUnits([...selectedUnits, id]);
            setAvailableUnits(availableUnits.filter(u => u.value !== id));
        }
    };

    const handleRemove = (id: ConfigValue) => {
        setSelectedUnits(selectedUnits.filter(i => i !== id));
        const unit = candidates.find(u => u.value === id);
        if (unit) setAvailableUnits([...availableUnits, unit]);
    };

    const handleSave = () => {
        modal.resolve(selectedUnits);
    };

    const handleClose = () => {
        modal.remove();
    }

    const filteredAvailable = availableUnits.filter(u =>
        String(u.value).includes(searchAllText) ||
        u.tags?.some(tag => tag.toLowerCase().includes(searchAllText.toLowerCase()))
    );

    const selectedObjects = selectedUnits.map(id => {
        const u = candidates.find(u => u.value === id);
        return u ?? { value: id, display: id, tags: [] };
    });

    const filteredSelected = selectedObjects.filter(u =>
        String(u.value).includes(searchSelectedText) ||
        u.tags?.some(tag => tag.toLowerCase().includes(searchSelectedText.toLowerCase()))
    );

    return (
        <Modal isOpen={modal.visible} onClose={modal.hide} size="4xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>选择</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Flex gap={4}>
                        <Box flex={1}>
                            <Text mb={2}>全部</Text>
                            <Input placeholder="搜索" mb={2} value={searchAllText} onChange={e => setSearchAllText(e.target.value)} />
                            <Box maxH="300px" overflowY="auto" bg={bg} p={2} borderRadius="md">
                                {filteredAvailable.map((u, id) => (
                                    <Box key={id} p={1} cursor="pointer" _hover={{ bg: "blue.100" }}
                                        onClick={() => handleAdd(u.value)}>
                                        {u.display}
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Box flex={1}>
                            <Text mb={2}>已选择</Text>
                            <Input placeholder="搜索" mb={2} value={searchSelectedText} onChange={e => setSearchSelectedText(e.target.value)} />
                            <Box maxH="300px" overflowY="auto" bg={bg} p={2} borderRadius="md">
                                {filteredSelected.map((u, id) => (
                                    <Box key={id} p={1} cursor="pointer" _hover={{ bg: "red.100" }}
                                        onClick={() => handleRemove(u.value)}>
                                        {u.display}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Flex>
                </ModalBody>

                <ModalFooter>
                    <Button onClick={handleSave} colorScheme="blue" mr={3}>保存</Button>
                    <Button onClick={handleClose}>取消</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
});

export default multiSelectModal;
