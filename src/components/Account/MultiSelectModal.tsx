import { Candidate, ConfigValue } from '@interfaces/Module';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Input, Flex, Box, Text, useColorModeValue, IconButton } from '@chakra-ui/react';
import { useState } from 'react';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { CloseIcon } from '@chakra-ui/icons';


interface MultiSelectModalProps {
    candidates: Candidate[];
    value: ConfigValue[];
}

const multiSelectModal = NiceModal.create(({ candidates, value }: MultiSelectModalProps) => {
    const modal = useModal();
    const bg = useColorModeValue('gray.100', 'gray.700');

    const [selectedUnits, setSelectedUnits] = useState<ConfigValue[]>(value);
    const [availableUnits, setAvailableUnits] = useState<Candidate[]>(candidates.filter((u) => !value.includes(u.value)));
    const [searchAllText, setSearchAllText] = useState('');
    const [searchSelectedText, setSearchSelectedText] = useState('');
    const [draggedUnit, setDraggedUnit] = useState<ConfigValue | null>(null);

    const handleAdd = (id: ConfigValue) => {
        if (!selectedUnits.includes(id)) {
            setSelectedUnits([...selectedUnits, id]);
            setAvailableUnits(availableUnits.filter((u) => u.value !== id));
        }
    };

    const handleRemove = (id: ConfigValue) => {
        setSelectedUnits(selectedUnits.filter(i => i !== id));
        const unit = candidates.find(u => u.value === id);
        if (unit) setAvailableUnits([...availableUnits, unit]);
    };

    const handleSave = () => {
        modal.resolve(selectedUnits);
        modal.remove();
    };

    const handleClose = () => {
        modal.remove();
    };

    const moveUnit = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newSelectedUnits = [...selectedUnits];
        const [movedUnit] = newSelectedUnits.splice(fromIndex, 1);
        newSelectedUnits.splice(toIndex, 0, movedUnit);

        setSelectedUnits(newSelectedUnits);
    };

    const handleDragStart = (unitId: ConfigValue) => {
        setDraggedUnit(unitId);
    };

    const handleDragEnd = () => {
        setDraggedUnit(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedUnit === null) return;

        const sourceIndex = selectedUnits.indexOf(draggedUnit);
        if (sourceIndex !== -1) {
            moveUnit(sourceIndex, targetIndex);
        }
    };
    const handleClearAll = () => {
        setSelectedUnits([]);
        setAvailableUnits(candidates);
    };

    const filteredAvailable = availableUnits.filter((u) => String(u.value).includes(searchAllText) || u.tags?.some((tag) => tag.toLowerCase().includes(searchAllText.toLowerCase())));

    const selectedObjects = selectedUnits.map((id) => {
        const u = candidates.find((u) => u.value === id);
        return u ?? { value: id, display: id, tags: [], nickname: null };
    });

    const filteredSelected = selectedObjects.filter(u =>
        String(u.value).includes(searchSelectedText) ||
        u.tags?.some(tag => tag.toLowerCase().includes(searchSelectedText.toLowerCase()))
    );

    return (
        <Modal isOpen={modal.visible} onClose={modal.hide} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>选择</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Flex gap={4}>
                        <Box flex={1}>
                            <Text mb={2}>未选择角色 ({availableUnits.length})</Text>
                            <Input placeholder="搜索" mb={2} value={searchAllText} onChange={(e) => setSearchAllText(e.target.value)} />
                            <Box maxH="600px" overflowY="auto" bg={bg} p={2} borderRadius="md">
                                {filteredAvailable.map((u, id) => (
                                    <Box key={id} p={1} cursor="pointer" _hover={{ bg: 'blue.100' }} onClick={() => handleAdd(u.value)}>
                                        {u.nickname ? u.nickname : u.display}
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Box flex={1}>
                            <Text mb={2}>已选择 ({selectedUnits.length})</Text>
                            <Input placeholder="搜索" mb={2} value={searchSelectedText} onChange={(e) => setSearchSelectedText(e.target.value)} />
                            <Box maxH="600px" overflowY="auto" bg={bg} p={2} borderRadius="md">
                                <Flex mb={2} alignItems="center" justifyContent="space-between">
                                    <Text fontSize="xs" color="gray.500">
                                        提示：拖拽角色可调整顺序
                                    </Text>
                                    <Button onClick={handleClearAll} size={'sm'} colorScheme="red">
                                        清空
                                    </Button>
                                </Flex>

                                {filteredSelected.map((u) => {
                                    const actualIndex = selectedUnits.indexOf(u.value);
                                    return (
                                        <Flex key={String(u.value)} alignItems="center" justifyContent="space-between" _hover={{ bg: 'red.100' }}>
                                            <Box
                                                p={1}
                                                cursor="grab"
                                                draggable
                                                onDragStart={() => handleDragStart(u.value)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, actualIndex)}
                                                flex={1}
                                                display="flex"
                                                justifyContent="space-between"
                                                alignItems="center"
                                            >
                                                {u.nickname ? u.nickname : u.display}
                                                <IconButton aria-label="移除" icon={<CloseIcon />} size="xs" onClick={() => handleRemove(u.value)} />
                                            </Box>
                                        </Flex>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Flex>
                </ModalBody>

                <ModalFooter>
                    <Button onClick={handleSave} colorScheme="blue" mr={3}>
                        保存
                    </Button>
                    <Button onClick={handleClose}>取消</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
});
NiceModal.register('multiSelectModal', multiSelectModal);
export default multiSelectModal;
