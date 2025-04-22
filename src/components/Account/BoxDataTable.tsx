import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, useColorModeValue, Box, Badge, Icon, Flex } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FaSortUp, FaSortDown, FaSort } from 'react-icons/fa';

// 定义角色数据接口
interface UnitData {
    unit_id: number;
    unit_name: string;
    owned: boolean;
    rarity: number;
    level: number;
    rank: number;
    equip: string;
    ub: number;
    sk1: number;
    sk2: number;
    ex: number;
    unique_equip: number;
    memory: number;
    pure_memory: number;
}

// 定义用户数据接口
interface UserBoxData {
    user_name: string;
    uid?: number;
    data_time?: string;
    jewel?: number;
    mother_stone?: number;
    star_cup?: number;
    heart_fragment?: number;
    user_info?: string[]; // 添加要显示的信息列配置
    units: UnitData[];
}

interface BoxDataTableProps {
    logContent: string | undefined;
}

// 排序类型
interface SortDirection {
    type: 'asc' | 'desc' | null;
}

interface SortConfig {
    unitId: number | null;
    attribute: string | null;
    direction: SortDirection['type'];
}

export function BoxDataTable({ logContent }: BoxDataTableProps) {
    // 排序状态
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        unitId: null,
        attribute: null,
        direction: null,
    });

    // 解析日志内容，提取用户数据
    const userData = useMemo(() => {
        if (!logContent) return [];

        const userDataArray: UserBoxData[] = [];
        const userSections = logContent.split(/===.*===/);

        for (const section of userSections) {
            if (!section.trim()) continue;

            const boxDataMatch = section.match(/BOX_DATA_START\s*(.*?)\s*BOX_DATA_END/s);
            if (boxDataMatch?.[1]) {
                try {
                    const boxData = JSON.parse(boxDataMatch[1]) as UserBoxData;
                    userDataArray.push(boxData);
                } catch (e) {
                    console.error('解析BOX数据失败:', e);
                }
            }
        }

        return userDataArray;
    }, [logContent]);

    // 获取所有角色ID列表（用于表头）
    const allUnitIds = useMemo(() => {
        const unitIds = new Set<number>();
        userData.forEach((user) => {
            user.units.forEach((unit) => {
                unitIds.add(unit.unit_id);
            });
        });
        return Array.from(unitIds);
    }, [userData]);

    // 为每个用户创建角色ID到角色数据的映射
    const userUnitMaps = useMemo(() => {
        return userData.map((user) => {
            const unitMap = new Map<number, UnitData>();
            user.units.forEach((unit) => {
                unitMap.set(unit.unit_id, unit);
            });
            return { user, unitMap };
        });
    }, [userData]);

    // 排序后的用户数据
    const sortedUserUnitMaps = useMemo(() => {
        if (!sortConfig.unitId || !sortConfig.attribute || !sortConfig.direction) {
            return userUnitMaps;
        }

        return [...userUnitMaps].sort((a, b) => {
            const unitA = a.unitMap.get(sortConfig.unitId!);
            const unitB = b.unitMap.get(sortConfig.unitId!);

            // 处理未拥有角色的情况
            if (!unitA?.owned && !unitB?.owned) return 0;
            if (!unitA?.owned) return 1;
            if (!unitB?.owned) return -1;

            const attrId = sortConfig.attribute as keyof UnitData;
            const valueA = unitA[attrId];
            const valueB = unitB[attrId];

            if (valueA === valueB) return 0;

            // 根据排序方向决定排序顺序
            const sortOrder = sortConfig.direction === 'asc' ? 1 : -1;
            return valueA < valueB ? -1 * sortOrder : 1 * sortOrder;
        });
    }, [userUnitMaps, sortConfig]);

    const bgColor = useColorModeValue('white', 'gray.700');
    const headerBgColor = useColorModeValue('gray.100', 'gray.600');
    const color1 = useColorModeValue('blue.50', 'blue.900');
    const color2 = useColorModeValue('green.50', 'green.900');

    if (userData.length === 0) {
        return null;
    }

    // 定义角色属性列表
    const unitAttributes = [
        { id: 'rarity', name: '星级' },
        { id: 'level', name: '等级' },
        { id: 'rank', name: 'Rank' },
        { id: 'ub', name: 'UB' },
        { id: 'sk1', name: 'S1' },
        { id: 'sk2', name: 'S2' },
        { id: 'ex', name: 'EX' },
        { id: 'unique_equip', name: '专武' },
        { id: 'memory', name: '碎片' },
        { id: 'pure_memory', name: '纯净' },
    ];

    // 处理排序点击
    const handleSort = (unitId: number, attribute: string) => {
        setSortConfig((prevConfig) => {
            // 如果点击的是当前排序的列，则切换排序方向
            if (prevConfig.unitId === unitId && prevConfig.attribute === attribute) {
                // 循环：asc -> desc -> null
                const nextDirection: SortDirection['type'] = prevConfig.direction === 'asc' ? 'desc' : prevConfig.direction === 'desc' ? null : 'asc';

                return {
                    unitId: nextDirection ? unitId : null,
                    attribute: nextDirection ? attribute : null,
                    direction: nextDirection,
                };
            }

            // 如果点击的是新列，则设置为升序
            return {
                unitId,
                attribute,
                direction: 'asc',
            };
        });
    };

    // 获取排序图标
    const getSortIcon = (unitId: number, attribute: string) => {
        if (sortConfig.unitId !== unitId || sortConfig.attribute !== attribute) {
            return <Icon as={FaSort} fontSize="xs" ml={1} opacity={0.5} />;
        }

        return sortConfig.direction === 'asc' ? <Icon as={FaSortUp} fontSize="xs" ml={1} /> : <Icon as={FaSortDown} fontSize="xs" ml={1} />;
    };

    // 获取第一个用户的信息列配置
    const infoColumns = userData[0]?.user_info?.length ? userData[0].user_info : [];

    return (
        <Box mt={4} rounded="lg" bg={bgColor} boxShadow="lg">
            <TableContainer>
                <Table size="sm" variant="unstyled" maxW="80%">
                    <Thead position="sticky" top={0} zIndex={1} bg={headerBgColor}>
                        <Tr>
                            <Th rowSpan={2} outline="1px solid gray" p={1} position="sticky" left={0} bg={headerBgColor} zIndex={2}>
                                用户名
                            </Th>
                            {infoColumns.includes('UID') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    UID
                                </Th>
                            )}
                            {infoColumns.includes('数据时间') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    数据时间
                                </Th>
                            )}
                            {infoColumns.includes('钻石') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    钻石
                                </Th>
                            )}
                            {infoColumns.includes('母猪石') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    母猪石
                                </Th>
                            )}
                            {infoColumns.includes('星球杯') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    星球杯
                                </Th>
                            )}
                            {infoColumns.includes('心碎') && (
                                <Th rowSpan={2} border="1px solid gray" p={1}>
                                    心碎
                                </Th>
                            )}
                            {allUnitIds.map((unitId, unitIndex) => {
                                const unitName = userData.find((user) => user.units.some((unit) => unit.unit_id === unitId))?.units.find((unit) => unit.unit_id === unitId)?.unit_name ?? `ID:${unitId}`;
                                const bgColorAlt = unitIndex % 2 === 0 ? color1 : color2;

                                return (
                                    <Th key={unitId} colSpan={unitAttributes.length} textAlign="center" bg={bgColorAlt} border="1px solid gray" p={1}>
                                        {unitName}
                                    </Th>
                                );
                            })}
                        </Tr>
                        <Tr>
                            {allUnitIds.map((unitId, unitIndex) =>
                                unitAttributes.map((attr) => {
                                    const bgColorAlt = unitIndex % 2 === 0 ? color1 : color2;

                                    return (
                                        <Th key={`${unitId}-${attr.id}`} textAlign="center" fontSize="xs" bg={bgColorAlt} cursor="pointer" onClick={() => handleSort(unitId, attr.id)} border="1px solid gray" p={1}>
                                            <Flex alignItems="center" justifyContent="center" overflow="hidden">
                                                {attr.name}
                                                {getSortIcon(unitId, attr.id)}
                                            </Flex>
                                        </Th>
                                    );
                                })
                            )}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {sortedUserUnitMaps.map(({ user, unitMap }) => (
                            <Tr key={user.uid}>
                                <Td outline="1px solid gray" p={1} position="sticky" left={0} bg={headerBgColor} zIndex={2}>
                                    {user.user_name}
                                </Td>
                                {infoColumns.includes('UID') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.uid}
                                    </Td>
                                )}
                                {infoColumns.includes('数据时间') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.data_time}
                                    </Td>
                                )}
                                {infoColumns.includes('钻石') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.jewel?.toLocaleString()}
                                    </Td>
                                )}
                                {infoColumns.includes('母猪石') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.mother_stone?.toLocaleString()}
                                    </Td>
                                )}
                                {infoColumns.includes('星球杯') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.star_cup?.toLocaleString()}
                                    </Td>
                                )}
                                {infoColumns.includes('心碎') && (
                                    <Td border="1px solid gray" p={1} bg={headerBgColor}>
                                        {user.heart_fragment?.toLocaleString()}
                                    </Td>
                                )}

                                {allUnitIds.map((unitId, unitIndex) => {
                                    const unit = unitMap.get(unitId);
                                    const bgColorAlt = unitIndex % 2 === 0 ? color1 : color2;

                                    if (!unit || !unit.owned) {
                                        // 如果没有该角色，所有属性列都显示"-"
                                        return unitAttributes.map((attr) => (
                                            <Td key={`${unitId}-${attr.id}`} textAlign="center" bg={bgColorAlt} opacity={0.5} border="1px solid gray" p={1}>
                                                -
                                            </Td>
                                        ));
                                    }

                                    // 返回该角色的所有属性列
                                    return unitAttributes.map((attr) => {
                                        const attrId = attr.id as keyof UnitData;
                                        const value = unit[attrId];

                                        // 为星级添加特殊样式
                                        if (attrId === 'rarity') {
                                            return (
                                                <Td key={`${unitId}-${attrId}`} textAlign="center" bg={bgColorAlt} border="1px solid gray" p={1}>
                                                    <Badge>{value}★</Badge>
                                                </Td>
                                            );
                                        }

                                        return (
                                            <Td key={`${unitId}-${attrId}`} textAlign="center" fontSize="xs" bg={bgColorAlt} border="1px solid gray" p={1}>
                                                {value}
                                            </Td>
                                        );
                                    });
                                })}
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}
