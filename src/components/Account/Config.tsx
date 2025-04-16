import { ConfigInfo, ConfigValue } from '@/interfaces/Module';
import { Menu, MenuButton, MenuList, MenuItem, HStack, IconButton, Switch, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Input, InputGroup, InputLeftAddon, InputRightAddon, Select, useToast, CheckboxGroup, Checkbox, Stack, Box, useColorModeValue, Textarea, Text, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Flex, Input as ChakraInput, VStack, Divider } from '@chakra-ui/react'
import { putAccountConfig } from '@/api/Account';
import { ChangeEventHandler, FocusEventHandler, useEffect, useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { SearchIcon, ChevronDownIcon, CloseIcon } from '@chakra-ui/icons';

interface ConfigProps {
    alias: string,
    value: ConfigValue,
    info: ConfigInfo
}

// 在现有的Config组件中添加表格类型的处理
export default function Config({ alias, value, info }: ConfigProps) {
    switch (info?.config_type) {
        case 'bool':
            return <ConfigBool alias={alias} value={value} info={info} />
        case 'int':
            return <ConfigInt alias={alias} value={value} info={info} />
        case 'single':
            return <ConfigSingle alias={alias} value={value} info={info} />
        case 'multi':
            return <ConfigMulti alias={alias} value={value} info={info} />
        case 'time':
            return <ConfigTime alias={alias} value={value} info={info} />
        case 'text':
            return <ConfigText alias={alias} value={value} info={info} />
        case 'unitlist':
            return <ConfigUnitList alias={alias} value={value} info={info} />
        case 'table':
            return <ConfigTable alias={alias} value={value} info={info} />
    }
}

function ConfigBool({ alias, value, info }: ConfigProps) {
    const toast = useToast();

    const onChange: ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
        putAccountConfig(alias, info.key, e.target.checked).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>
            <InputRightAddon>
                <Switch id={info.key} defaultChecked={value as boolean} onChange={onChange} />
            </InputRightAddon>
        </InputGroup>
    )
}

function ConfigInt({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (_: string, valueAsNumber: number) => {
        putAccountConfig(alias, info.key, valueAsNumber).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <NumberInput onChange={onChange} id={info.key} defaultValue={value as number} min={Math.min(...info.candidates as number[])} max={Math.max(...info.candidates as number[])}>
                <NumberInputField />
                <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                </NumberInputStepper>
            </NumberInput>
        </InputGroup>
    )
}

function ConfigSingle({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        let value: ConfigValue = e.target.value;
        const intValue = Number(value);
        if (!isNaN(intValue))
            value = intValue;
        putAccountConfig(alias, info.key, value).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <Select onChange={onChange} id={info.key} defaultValue={value as string | number} >
                {
                    info.candidates.map((element) => {
                        return <option key={element as string | number} value={element as string | number} >{element}</option>
                    })
                }
            </Select>
        </InputGroup>
    )
}

function ConfigMulti({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onChange = (value: (string | number)[]) => {
        let postValue = value;
        const intValue = postValue.map(option => Number(option))
        if (intValue.length != 0 && !isNaN(intValue[0]))
            postValue = intValue;

        putAccountConfig(alias, info.key, postValue as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }
    return (
        <InputGroup>
            <InputLeftAddon style={{ height: 'auto' }}>
                {info.desc}
            </InputLeftAddon>

            <Box paddingLeft="16px" paddingRight="32px" overflowY="scroll" borderWidth="1px" borderColor={useColorModeValue("gray.200", "gray.600")} borderRadius="md">
                <CheckboxGroup onChange={onChange} defaultValue={(value as (string | number)[]).map(option => String(option))} >
                    <Stack spacing={[1, 5]} direction={['column', 'row']}>
                        {
                            info.candidates.map((element) => {
                                return <Checkbox key={element as string | number} value={String(element) as string | number} >{element}</Checkbox>
                            })
                        }
                    </Stack>
                </CheckboxGroup>
            </Box>

        </InputGroup >
    )
}

function ConfigTime({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onBlur: ChangeEventHandler<HTMLInputElement> = (e: React.ChangeEvent<HTMLInputElement>) => {
        putAccountConfig(alias, info.key, e.target.value as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <InputGroup>
            <InputLeftAddon>
                {info.desc}
            </InputLeftAddon>

            <Input type='time' onBlur={onBlur} id={info.key} defaultValue={value as string} />
        </InputGroup>
    )
}

function ConfigText({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const onBlur: FocusEventHandler<HTMLTextAreaElement> = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        putAccountConfig(alias, info.key, e.target.value as ConfigValue).then((res) => {
            toast({ status: 'success', title: '保存成功', description: res });
        }).catch((err: AxiosError) => {
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    }

    return (
        <>
            <Text>
                {info.desc}
            </Text>

            <Textarea onBlur={onBlur} id={info.key} defaultValue={value as string} />
        </>
    )
}

function ConfigUnitList({ alias, value, info }: ConfigProps) {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [displayValue, setDisplayValue] = useState<string>("");
    const [allUnits, setAllUnits] = useState<{ id: string, name: string }[]>([]);
    const [availableUnits, setAvailableUnits] = useState<{ id: string, name: string }[]>([]);
    const [filteredAvailableUnits, setFilteredAvailableUnits] = useState<{ id: string, name: string }[]>([]);
    const [filteredSelectedUnits, setFilteredSelectedUnits] = useState<{ id: string, name: string }[]>([]);
    const [searchAllText, setSearchAllText] = useState("");
    const [searchSelectedText, setSearchSelectedText] = useState("");
    const [draggedUnit, setDraggedUnit] = useState<string | null>(null);
    // 预先计算颜色值，避免在回调中使用hooks
    const allUnitsBgColor = useColorModeValue("gray.50", "gray.700");
    const hoverBgColor = useColorModeValue("gray.100", "gray.600");

    // 初始化数据
    useEffect(() => {
        try {
            // 防御性检查
            if (!info?.candidates) {
                console.error("无效的配置信息:", info);
                setDisplayValue("配置数据错误");
                return;
            }

            // 解析所有角色数据
            const units = info.candidates.map(candidate => {
                try {
                    const [id, name] = String(candidate).split(':');
                    return { id: id.trim(), name }; // 确保ID没有空格
                } catch (e) {
                    console.error("解析角色数据错误:", e, candidate);
                    return { id: String(candidate).trim(), name: String(candidate) };
                }
            });

            // 设置所有角色数据
            setAllUnits(units);

            // 解析已选择的角色 - 这里处理的是 value 参数，而不是 info.key
            let selectedIds: string[] = [];

            console.log("当前value类型:", typeof value, "值:", value);

            if (Array.isArray(value)) {
                // 如果已经是数组格式，直接使用，并确保每个ID都是干净的字符串
                selectedIds = value.map(v => String(v).trim());
            } else if (typeof value === 'string' && value) {
                // 向后兼容：如果是字符串格式，转换为数组
                selectedIds = value.split(',').map(id => id.trim()).filter(id => id !== '');
            }

            // 更新选中的角色ID列表
            setSelectedUnits(selectedIds);

            // 设置显示值 - 将ID转换为名称
            const selectedNames = selectedIds.map(id => {
                const unit = units.find(u => u.id === id);
                return unit ? unit.name : id;
            });
            setDisplayValue(selectedNames.join(', ') || "未选择角色");

            // 设置已选择的角色对象列表 - 用于UI显示
            const selectedUnitObjects = selectedIds.map(id => {
                const unit = units.find(u => u.id === id);
                return unit ? unit : { id, name: id };
            });
            setFilteredSelectedUnits(selectedUnitObjects);

            // 设置可选择的角色列表 - 排除已选择的角色
            const availableUnitsList = units.filter(unit => !selectedIds.includes(unit.id));
            setAvailableUnits(availableUnitsList);
            setFilteredAvailableUnits(availableUnitsList);
        } catch (error) {
            console.error("ConfigUnitList 初始化错误:", error);
            setDisplayValue("组件初始化错误");
        }
    }, [value, info.candidates, info]);

    // 搜索可选择角色
    const handleSearchAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchText = e.target.value.toLowerCase();
        setSearchAllText(searchText);
        if (!searchText) {
            setFilteredAvailableUnits(availableUnits);
        } else {
            const filtered = availableUnits.filter(unit =>
                unit.name.toLowerCase().includes(searchText) ||
                unit.id.toLowerCase().includes(searchText)
            );
            setFilteredAvailableUnits(filtered);
        }
    };

    // 搜索已选择角色
    const handleSearchSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const searchText = e.target.value.toLowerCase();
        setSearchSelectedText(searchText);

        const selectedUnitObjects = selectedUnits.map(id => {
            const unit = allUnits.find(u => u.id === id);
            return unit ? unit : { id, name: id };
        });

        if (!searchText) {
            setFilteredSelectedUnits(selectedUnitObjects);
        } else {
            const filtered = selectedUnitObjects.filter(unit =>
                unit.name.toLowerCase().includes(searchText) ||
                unit.id.toLowerCase().includes(searchText)
            );
            setFilteredSelectedUnits(filtered);
        }
    };

    // 添加角色
    const addUnit = (unit: { id: string, name: string }) => {
        if (!selectedUnits.includes(unit.id)) {
            const newSelectedUnits = [...selectedUnits, unit.id];
            setSelectedUnits(newSelectedUnits);

            // 更新已选择的角色列表
            const selectedUnitObjects = newSelectedUnits.map(id => {
                const u = allUnits.find(unit => unit.id === id);
                return u ? u : { id, name: id };
            });

            // 应用搜索过滤
            if (searchSelectedText) {
                const filtered = selectedUnitObjects.filter(unit =>
                    unit.name.toLowerCase().includes(searchSelectedText) ||
                    unit.id.toLowerCase().includes(searchSelectedText)
                );
                setFilteredSelectedUnits(filtered);
            } else {
                setFilteredSelectedUnits(selectedUnitObjects);
            }

            // 更新可选择的角色列表 - 移除刚添加的角色
            const newAvailableUnits = availableUnits.filter(u => u.id !== unit.id);
            setAvailableUnits(newAvailableUnits);

            // 应用搜索过滤
            if (searchAllText) {
                const filtered = newAvailableUnits.filter(unit =>
                    unit.name.toLowerCase().includes(searchAllText) ||
                    unit.id.toLowerCase().includes(searchAllText)
                );
                setFilteredAvailableUnits(filtered);
            } else {
                setFilteredAvailableUnits(newAvailableUnits);
            }
        }
    };

    // 移除角色
    const removeUnit = (unit: { id: string, name: string }) => {
        const newSelectedUnits = selectedUnits.filter(id => id !== unit.id);
        setSelectedUnits(newSelectedUnits);

        // 更新已选择的角色列表
        const selectedUnitObjects = newSelectedUnits.map(id => {
            const u = allUnits.find(unit => unit.id === id);
            return u ? u : { id, name: id };
        });

        // 应用搜索过滤
        if (searchSelectedText) {
            const filtered = selectedUnitObjects.filter(unit =>
                unit.name.toLowerCase().includes(searchSelectedText) ||
                unit.id.toLowerCase().includes(searchSelectedText)
            );
            setFilteredSelectedUnits(filtered);
        } else {
            setFilteredSelectedUnits(selectedUnitObjects);
        }

        // 更新可选择的角色列表 - 添加刚移除的角色
        const unitToAdd = allUnits.find(u => u.id === unit.id);
        if (unitToAdd) {
            const newAvailableUnits = [...availableUnits, unitToAdd];
            setAvailableUnits(newAvailableUnits);

            // 应用搜索过滤
            if (searchAllText) {
                const filtered = newAvailableUnits.filter(unit =>
                    unit.name.toLowerCase().includes(searchAllText) ||
                    unit.id.toLowerCase().includes(searchAllText)
                );
                setFilteredAvailableUnits(filtered);
            } else {
                setFilteredAvailableUnits(newAvailableUnits);
            }
        }
    };
    // 移动角色到指定位置
    const moveUnit = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newSelectedUnits = [...selectedUnits];
        const [movedUnit] = newSelectedUnits.splice(fromIndex, 1);
        newSelectedUnits.splice(toIndex, 0, movedUnit);

        setSelectedUnits(newSelectedUnits);

        // 更新已选择的角色列表
        const selectedUnitObjects = newSelectedUnits.map(id => {
            const u = allUnits.find(unit => unit.id === id);
            return u ? u : { id, name: id };
        });

        // 应用搜索过滤
        if (searchSelectedText) {
            const filtered = selectedUnitObjects.filter(unit =>
                unit.name.toLowerCase().includes(searchSelectedText) ||
                unit.id.toLowerCase().includes(searchSelectedText)
            );
            setFilteredSelectedUnits(filtered);
        } else {
            setFilteredSelectedUnits(selectedUnitObjects);
        }
    };

    // 拖拽开始
    const handleDragStart = (unitId: string) => {
        setDraggedUnit(unitId);
    };

    // 拖拽结束
    const handleDragEnd = () => {
        setDraggedUnit(null);
    };

    // 拖拽悬停
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 放置
    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedUnit === null) return;

        const sourceIndex = selectedUnits.indexOf(draggedUnit);
        if (sourceIndex !== -1) {
            moveUnit(sourceIndex, targetIndex);
        }
    };
    // 保存选择
    const saveSelection = () => {
        // 确保没有空字符串，并转换为数字类型
        const validSelectedUnits = selectedUnits
            .filter(id => id.trim() !== '')
            .map(id => parseInt(id.trim(), 10)); // 转换为数字

        // 直接使用数组格式保存，而不是字符串
        console.log("保存的数组:", validSelectedUnits);

        putAccountConfig(alias, info.key, validSelectedUnits).then((res) => {
            console.log("保存成功，服务器响应:", res);
            toast({ status: 'success', title: '保存成功', description: res });

            // 更新显示值
            const selectedNames = validSelectedUnits.map(id => {
                const unit = allUnits.find(u => u.id === String(id));
                return unit ? unit.name : String(id);
            });
            setDisplayValue(selectedNames.join(', ') || "未选择角色");

            // 保存到本地存储，作为备份
            try {
                localStorage.setItem(`unitlist_${alias}_${info.key}`, JSON.stringify(validSelectedUnits));
            } catch (e) {
                console.error("本地存储失败:", e);
            }

            onClose();
        }).catch((err: AxiosError) => {
            console.error("保存失败:", err);
            toast({ status: 'error', title: '保存失败', description: err.response?.data as string || "网络错误" });
        });
    };
    // 排序函数
    const sortUnits = (type: 'name' | 'id' | 'id-desc') => {
        const newSelectedUnits = [...selectedUnits];

        if (type === 'name') {
            newSelectedUnits.sort((a, b) => {
                const unitA = allUnits.find(u => u.id === a);
                const unitB = allUnits.find(u => u.id === b);
                return (unitA?.name ?? '').localeCompare(unitB?.name ?? '');
            });
        } else if (type === 'id') {
            newSelectedUnits.sort((a, b) => parseInt(a) - parseInt(b));
        } else if (type === 'id-desc') {
            newSelectedUnits.sort((a, b) => parseInt(b) - parseInt(a));
        }

        setSelectedUnits(newSelectedUnits);

        // 更新已选择的角色列表
        const selectedUnitObjects = newSelectedUnits.map(id => {
            const u = allUnits.find(unit => unit.id === id);
            return u ? u : { id, name: id };
        });

        setFilteredSelectedUnits(selectedUnitObjects);
    };

    return (
        <>
            <InputGroup>
                <InputLeftAddon>
                    {info.desc}
                </InputLeftAddon>
                <Input value={displayValue} isReadOnly onClick={onOpen} cursor="pointer" />
                <InputRightAddon>
                    <Button size="sm" onClick={onOpen}>选择</Button>
                </InputRightAddon>
            </InputGroup>

            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>选择角色</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Flex direction={{ base: "column", md: "row" }} height="700px">
                            {/* 左侧：可选择的角色 */}
                            <VStack flex="1" spacing={2} align="stretch" mr={{ base: 0, md: 2 }} mb={{ base: 4, md: 0 }}>
                                <Text fontWeight="bold">可选择角色 ({availableUnits.length})</Text>
                                <InputGroup size="sm">
                                    <InputLeftAddon>
                                        <SearchIcon />
                                    </InputLeftAddon>
                                    <ChakraInput
                                        placeholder="搜索角色..."
                                        value={searchAllText}
                                        onChange={handleSearchAll}
                                    />
                                </InputGroup>
                                <Box
                                    flex="1"
                                    overflowY="auto"
                                    borderWidth="1px"
                                    borderRadius="md"
                                    p={2}
                                    bg={allUnitsBgColor}
                                >
                                    {filteredAvailableUnits.map(unit => (
                                        <Box
                                            key={unit.id}
                                            p={2}
                                            borderRadius="md"
                                            _hover={{ bg: hoverBgColor }}
                                            cursor="pointer"
                                            onClick={() => addUnit(unit)}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Text>{unit.name}</Text>
                                            <Text fontSize="xs" color="gray.500">{unit.id}</Text>
                                        </Box>
                                    ))}
                                </Box>
                            </VStack>

                            {/* 中间：分隔线 */}
                            <Divider orientation="vertical" display={{ base: "none", md: "block" }} />
                            <Divider orientation="horizontal" display={{ base: "block", md: "none" }} />

                            {/* 右侧：已选择角色 */}
                            <VStack flex="1" spacing={2} align="stretch" ml={{ base: 0, md: 2 }} mt={{ base: 4, md: 0 }}>
                                <Text fontWeight="bold">已选择角色 ({selectedUnits.length})</Text>
                                <InputGroup size="sm">
                                    <InputLeftAddon>
                                        <SearchIcon />
                                    </InputLeftAddon>
                                    <ChakraInput
                                        placeholder="搜索已选择角色..."
                                        value={searchSelectedText}
                                        onChange={handleSearchSelected}
                                    />
                                </InputGroup>
                                <Box
                                    flex="1"
                                    overflowY="auto"
                                    borderWidth="1px"
                                    borderRadius="md"
                                    p={2}
                                    bg={allUnitsBgColor}
                                >
                                    {!searchSelectedText && (
                                        <Text fontSize="xs" color="gray.500" mb={2}>
                                            提示：拖拽角色可调整顺序
                                        </Text>
                                    )}
                                    {filteredSelectedUnits.map((unit, index) => {
                                        const actualIndex = selectedUnits.indexOf(unit.id);
                                        return (
                                            <Box
                                                key={unit.id}
                                                p={2}
                                                borderRadius="md"
                                                bg={draggedUnit === unit.id ? "gray.300" : "transparent"}
                                                _hover={{ bg: hoverBgColor }}
                                                cursor="grab"
                                                display="flex"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                draggable={!searchSelectedText}
                                                onDragStart={() => handleDragStart(unit.id)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={(e) => handleDragOver(e)}
                                                onDrop={(e) => handleDrop(e, actualIndex)}
                                            >
                                                <HStack flex="1">
                                                    <Text>{index + 1}.</Text>
                                                    <Text flex="1">{unit.name}</Text>
                                                </HStack>
                                                <HStack>
                                                    <Text fontSize="xs" color="gray.500">{unit.id}</Text>
                                                    <IconButton
                                                        aria-label="移除"
                                                        icon={<CloseIcon />}
                                                        size="xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeUnit(unit);
                                                        }}
                                                    />
                                                </HStack>
                                            </Box>
                                        );
                                    })}
                                </Box>
                                <HStack>
                                    <Menu>
                                        <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />}>
                                            排序
                                        </MenuButton>
                                        <MenuList>
                                            <MenuItem onClick={() => sortUnits('name')}>按名称排序</MenuItem>
                                            <MenuItem onClick={() => sortUnits('id')}>按ID排序</MenuItem>
                                            <MenuItem onClick={() => sortUnits('id-desc')}>按ID倒序</MenuItem>
                                        </MenuList>
                                    </Menu>
                                    <Button colorScheme="blue" flex="1" onClick={saveSelection}>
                                        保存
                                    </Button>
                                </HStack>
                            </VStack>
                        </Flex>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}

// 添加表格组件
function ConfigTable({ value, info }: ConfigProps) {
    // 定义用户数据和角色数据的接口
    interface UnitData {
        unit_id: number;
        unit_name: string;
        owned: boolean;
        rarity?: number;
        level?: number;
        rank?: number;
        equip?: string;
        ub?: number;
        sk1?: number;
        sk2?: number;
        ex?: number;
        unique_equip?: number;
        memory?: number;
        pure_memory?: number;
    }

    interface UserData {
        user_name: string;
        uid: number;
        data_time: string;
        jewel: number;
        mother_stone: number;
        star_cup: number;
        heart_fragment: number;
        units: UnitData[];
    }

    // 获取表格数据
    const getTableData = useCallback((): UserData[] => {
        if (value && typeof value === 'object') {
            if ('all_data' in value && Array.isArray(value.all_data)) {
                return value.all_data as UserData[];
            } else if (Array.isArray(value)) {
                // 修复类型转换错误，先转为 unknown 再转为 UserData[]
                return value as unknown as UserData[];
            }
        }
        return [];
    }, [value]);

    // 使用 useState 和 useEffect 来响应 value 的变化
    const [tableData, setTableData] = useState<UserData[]>(getTableData());
    const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
    const [searchText, setSearchText] = useState<string>("");
    const { isOpen, onOpen, onClose } = useDisclosure();

    // 当 value 变化时更新表格数据
    useEffect(() => {
        setTableData(getTableData());
    }, [getTableData]);

    // 颜色设置
    const bg = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // 如果没有数据，显示提示信息
    if (!tableData || tableData.length === 0) {
        return (
            <Box p={4} borderWidth="1px" borderRadius="lg" bg={bg}>
                <Text>暂无数据，请先运行获取box练度表格功能</Text>
            </Box>
        );
    }

    // 获取所有角色ID列表
    const getAllUnitIds = (): number[] => {
        const unitIds = new Set<number>();
        tableData.forEach(userData => {
            userData.units.forEach(unit => {
                unitIds.add(unit.unit_id);
            });
        });
        return Array.from(unitIds);
    };

    // 获取所有角色名称映射
    const getUnitNameMap = (): Record<number, string> => {
        const unitNameMap: Record<number, string> = {};
        tableData.forEach(userData => {
            userData.units.forEach(unit => {
                unitNameMap[unit.unit_id] = unit.unit_name;
            });
        });
        return unitNameMap;
    };

    const unitNameMap = getUnitNameMap();

    // 处理角色选择
    const handleUnitSelection = (unitIds: number[]) => {
        setSelectedUnits(unitIds);
        onClose();
    };

    // 处理搜索
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    // 过滤角色
    const getFilteredUnits = (): number[] => {
        if (!searchText) {
            return selectedUnits.length > 0 ? selectedUnits : getAllUnitIds().slice(0, 5); // 默认显示前5个角色
        }

        const searchLower = searchText.toLowerCase();
        return getAllUnitIds().filter(unitId => {
            const unitName = unitNameMap[unitId] || "";
            return unitName.toLowerCase().includes(searchLower) || String(unitId).includes(searchLower);
        });
    };

    const filteredUnits = getFilteredUnits();

    return (
        <Box p={4} borderWidth="1px" borderRadius="lg" bg={bg}>
            <Text fontSize="xl" fontWeight="bold" mb={4}>{info.desc}</Text>

            {/* 搜索和选择按钮 */}
            <Flex mb={4} gap={2}>
                <InputGroup maxWidth="300px">
                    <InputLeftAddon>
                        <SearchIcon />
                    </InputLeftAddon>
                    <Input
                        placeholder="搜索角色..."
                        value={searchText}
                        onChange={handleSearch}
                    />
                </InputGroup>
                <Button onClick={onOpen}>二次过滤角色</Button>
            </Flex>

            {/* 角色表格 - 修改容器样式确保滚动条正常显示 */}
            <Box
                position="relative"
                maxWidth="100%"
                css={{
                    '&::-webkit-scrollbar': {
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                    }
                }}
            >
                <div style={{
                    position: 'relative',
                    overflow: 'auto',
                    maxHeight: '70vh',
                    maxWidth: '100%'
                }}>
                    <table style={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        width: 'auto',
                        tableLayout: 'fixed',
                        minWidth: 'max-content' // 确保表格不会收缩
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: bg }}>
                                <th style={{
                                    border: '1px solid',
                                    borderColor,
                                    padding: '8px',
                                    textAlign: 'center',
                                    width: '60px',
                                    minWidth: '60px',
                                    position: 'sticky',
                                    top: 0,
                                    left: 0,
                                    zIndex: 3,
                                    backgroundColor: bg
                                }}>序号</th>
                                <th style={{
                                    border: '1px solid',
                                    borderColor,
                                    padding: '8px',
                                    textAlign: 'center',
                                    width: '160px',
                                    minWidth: '160px',
                                    position: 'sticky',
                                    top: 0,
                                    left: '60px',
                                    zIndex: 2,
                                    backgroundColor: bg
                                }}>用户名</th>
                                {filteredUnits.map(unitId => (
                                    <th
                                        key={unitId}
                                        style={{
                                            border: '1px solid',
                                            borderColor,
                                            padding: '8px',
                                            textAlign: 'center',
                                            width: '400px',
                                            minWidth: '400px',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            backgroundColor: bg
                                        }}
                                    >
                                        {unitNameMap[unitId] || unitId}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((userData, index) => (
                                <tr key={userData.uid}>
                                    <td style={{
                                        border: '1px solid',
                                        borderColor,
                                        padding: '8px',
                                        textAlign: 'center',
                                        width: '60px',
                                        minWidth: '60px',
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 1,
                                        backgroundColor: bg
                                    }}>
                                        {index + 1}
                                    </td>
                                    <td style={{
                                        border: '1px solid',
                                        borderColor,
                                        padding: '8px',
                                        textAlign: 'center',
                                        width: '160px',
                                        minWidth: '160px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        position: 'sticky',
                                        left: '60px',
                                        zIndex: 1,
                                        backgroundColor: bg
                                    }}>
                                        {userData.user_name}
                                    </td>
                                    {filteredUnits.map(unitId => {
                                        const unit = userData.units.find(u => u.unit_id === unitId);
                                        return (
                                            <td
                                                key={`${userData.uid}-${unitId}`}
                                                style={{
                                                    border: '1px solid',
                                                    borderColor,
                                                    padding: '0',
                                                    textAlign: 'center',
                                                    backgroundColor: !unit || !unit.owned ? '#CCCCCC' :
                                                        unit.rarity === 6 ? '#FFD700' :
                                                            unit.rarity === 5 ? '#E6E6FA' : 'transparent',
                                                    height: '100%'
                                                }}
                                            >
                                                {unit && unit.owned ? (
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '0.5fr 0.8fr 0.6fr 1fr 2fr 0.8fr 0.8fr 0.8fr',
                                                        width: '100%',
                                                        height: '100%',
                                                        minHeight: '30px'
                                                    }}>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            ★{unit.rarity}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            Lv{unit.level}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            R{unit.rank}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {unit.equip}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {unit.ub ?? 0}/{unit.sk1 ?? 0}/{unit.sk2 ?? 0}/{unit.ex ?? 0}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            专{unit.unique_equip ?? 0}
                                                        </div>
                                                        <div style={{
                                                            borderRight: '1px solid rgba(160, 160, 160, 0.5)',
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            碎{unit.memory ?? 0}
                                                        </div>
                                                        <div style={{
                                                            padding: '2px',
                                                            fontSize: '0.85em',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            金{unit.pure_memory ?? 0}
                                                        </div>
                                                    </div>
                                                ) : '未获得'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Box>

            {/* 角色选择模态框 */}
            <Modal isOpen={isOpen} onClose={onClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>选择要显示的角色</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <UnitSelector
                            allUnits={getAllUnitIds().map(id => ({ id, name: unitNameMap[id] || String(id) }))}
                            selectedUnits={selectedUnits}
                            onSave={handleUnitSelection}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}

// 添加角色选择器组件
interface UnitSelectorProps {
    allUnits: { id: number, name: string }[];
    selectedUnits: number[];
    onSave: (selectedUnits: number[]) => void;
}

function UnitSelector({ allUnits, selectedUnits: initialSelectedUnits, onSave }: UnitSelectorProps) {
    const [selectedUnits, setSelectedUnits] = useState<number[]>(initialSelectedUnits);
    const [searchAllText, setSearchAllText] = useState<string>("");
    const [searchSelectedText, setSearchSelectedText] = useState<string>("");
    const [draggedUnit, setDraggedUnit] = useState<number | null>(null);

    // 预先计算颜色值
    const allUnitsBgColor = useColorModeValue("gray.50", "gray.700");
    const hoverBgColor = useColorModeValue("gray.100", "gray.600");

    // 获取可选择的角色
    const getAvailableUnits = () => {
        return allUnits.filter(unit => !selectedUnits.includes(unit.id));
    };

    // 获取已选择的角色
    const getSelectedUnitObjects = () => {
        return selectedUnits.map(id => {
            const unit = allUnits.find(u => u.id === id);
            return unit ? unit : { id, name: String(id) };
        });
    };

    // 过滤可选择的角色
    const getFilteredAvailableUnits = () => {
        const availableUnits = getAvailableUnits();
        if (!searchAllText) {
            return availableUnits;
        }

        const searchLower = searchAllText.toLowerCase();
        return availableUnits.filter(unit =>
            unit.name.toLowerCase().includes(searchLower) ||
            String(unit.id).toLowerCase().includes(searchLower)
        );
    };

    // 过滤已选择的角色
    const getFilteredSelectedUnits = () => {
        const selectedUnitObjects = getSelectedUnitObjects();
        if (!searchSelectedText) {
            return selectedUnitObjects;
        }

        const searchLower = searchSelectedText.toLowerCase();
        return selectedUnitObjects.filter(unit =>
            unit.name.toLowerCase().includes(searchLower) ||
            String(unit.id).toLowerCase().includes(searchLower)
        );
    };

    // 添加角色
    const addUnit = (unit: { id: number, name: string }) => {
        if (!selectedUnits.includes(unit.id)) {
            setSelectedUnits([...selectedUnits, unit.id]);
        }
    };

    // 移除角色
    const removeUnit = (unit: { id: number, name: string }) => {
        setSelectedUnits(selectedUnits.filter(id => id !== unit.id));
    };

    // 移动角色到指定位置
    const moveUnit = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newSelectedUnits = [...selectedUnits];
        const [movedUnit] = newSelectedUnits.splice(fromIndex, 1);
        newSelectedUnits.splice(toIndex, 0, movedUnit);

        setSelectedUnits(newSelectedUnits);
    };

    // 拖拽开始
    const handleDragStart = (unitId: number) => {
        setDraggedUnit(unitId);
    };

    // 拖拽结束
    const handleDragEnd = () => {
        setDraggedUnit(null);
    };

    // 拖拽悬停
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // 放置
    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedUnit === null) return;

        const sourceIndex = selectedUnits.indexOf(draggedUnit);
        if (sourceIndex !== -1) {
            moveUnit(sourceIndex, targetIndex);
        }
    };

    // 保存选择
    const handleSave = () => {
        onSave(selectedUnits);
    };

    // 排序函数
    const sortUnits = (type: 'name' | 'id' | 'id-desc') => {
        const newSelectedUnits = [...selectedUnits];

        if (type === 'name') {
            newSelectedUnits.sort((a, b) => {
                const unitA = allUnits.find(u => u.id === a);
                const unitB = allUnits.find(u => u.id === b);
                return (unitA?.name ?? '').localeCompare(unitB?.name ?? '');
            });
        } else if (type === 'id') {
            newSelectedUnits.sort((a, b) => a - b);
        } else if (type === 'id-desc') {
            newSelectedUnits.sort((a, b) => b - a);
        }

        setSelectedUnits(newSelectedUnits);
    };

    return (
        <Flex direction={{ base: "column", md: "row" }} height="700px">
            {/* 左侧：可选择的角色 */}
            <VStack flex="1" spacing={2} align="stretch" mr={{ base: 0, md: 2 }} mb={{ base: 4, md: 0 }}>
                <Text fontWeight="bold">可选择角色 ({getAvailableUnits().length})</Text>
                <InputGroup size="sm">
                    <InputLeftAddon>
                        <SearchIcon />
                    </InputLeftAddon>
                    <ChakraInput
                        placeholder="搜索角色..."
                        value={searchAllText}
                        onChange={(e) => setSearchAllText(e.target.value)}
                    />
                </InputGroup>
                <Box
                    flex="1"
                    overflowY="auto"
                    borderWidth="1px"
                    borderRadius="md"
                    p={2}
                    bg={allUnitsBgColor}
                >
                    {getFilteredAvailableUnits().map(unit => (
                        <Box
                            key={unit.id}
                            p={2}
                            borderRadius="md"
                            _hover={{ bg: hoverBgColor }}
                            cursor="pointer"
                            onClick={() => addUnit(unit)}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Text>{unit.name}</Text>
                            <Text fontSize="xs" color="gray.500">{unit.id}</Text>
                        </Box>
                    ))}
                </Box>
            </VStack>

            {/* 中间：分隔线 */}
            <Divider orientation="vertical" display={{ base: "none", md: "block" }} />
            <Divider orientation="horizontal" display={{ base: "block", md: "none" }} />

            {/* 右侧：已选择角色 */}
            <VStack flex="1" spacing={2} align="stretch" ml={{ base: 0, md: 2 }} mt={{ base: 4, md: 0 }}>
                <Text fontWeight="bold">已选择角色 ({selectedUnits.length})</Text>
                <InputGroup size="sm">
                    <InputLeftAddon>
                        <SearchIcon />
                    </InputLeftAddon>
                    <ChakraInput
                        placeholder="搜索已选择角色..."
                        value={searchSelectedText}
                        onChange={(e) => setSearchSelectedText(e.target.value)}
                    />
                </InputGroup>
                <Box
                    flex="1"
                    overflowY="auto"
                    borderWidth="1px"
                    borderRadius="md"
                    p={2}
                    bg={allUnitsBgColor}
                >
                    {!searchSelectedText && (
                        <Text fontSize="xs" color="gray.500" mb={2}>
                            提示：拖拽角色可调整顺序
                        </Text>
                    )}
                    {getFilteredSelectedUnits().map((unit, index) => {
                        const actualIndex = selectedUnits.indexOf(unit.id);
                        return (
                            <Box
                                key={unit.id}
                                p={2}
                                borderRadius="md"
                                bg={draggedUnit === unit.id ? "gray.300" : "transparent"}
                                _hover={{ bg: hoverBgColor }}
                                cursor="grab"
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                draggable={!searchSelectedText}
                                onDragStart={() => handleDragStart(unit.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e)}
                                onDrop={(e) => handleDrop(e, actualIndex)}
                            >
                                <HStack flex="1">
                                    <Text>{index + 1}.</Text>
                                    <Text flex="1">{unit.name}</Text>
                                </HStack>
                                <HStack>
                                    <Text fontSize="xs" color="gray.500">{unit.id}</Text>
                                    <IconButton
                                        aria-label="移除"
                                        icon={<CloseIcon />}
                                        size="xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeUnit(unit);
                                        }}
                                    />
                                </HStack>
                            </Box>
                        );
                    })}
                </Box>
                <HStack>
                    <Menu>
                        <MenuButton as={Button} size="sm" rightIcon={<ChevronDownIcon />}>
                            排序
                        </MenuButton>
                        <MenuList>
                            <MenuItem onClick={() => sortUnits('name')}>按名称排序</MenuItem>
                            <MenuItem onClick={() => sortUnits('id')}>按ID排序</MenuItem>
                            <MenuItem onClick={() => sortUnits('id-desc')}>按ID倒序</MenuItem>
                        </MenuList>
                    </Menu>
                    <Button colorScheme="blue" flex="1" onClick={handleSave}>
                        保存
                    </Button>
                </HStack>
            </VStack>
        </Flex>
    );
}