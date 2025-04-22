import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, useColorModeValue, Tabs, TabList, TabPanels, Tab, TabPanel, Badge, Tooltip, Text, Box, Heading } from '@chakra-ui/react';
import { useMemo } from 'react';

// 使用与SingleResult.tsx中相同的接口定义
interface BoxTableData {
    message: string;
    accounts_table: {
        序号: number;
        用户名: string;
        UID: number;
        数据时间: string;
        钻石: number;
        母猪石: number;
        星球杯: number;
        心碎: number;
        角色数量: number;
    }[];
    all_data: {
        user_name: string;
        uid: number;
        data_time: string;
        jewel: number;
        mother_stone: number;
        star_cup: number;
        heart_fragment: number;
        units: {
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
        }[];
    }[];
    current_uid: number;
}

interface BoxTableProps {
    data: BoxTableData;
}

export function BoxTable({ data }: BoxTableProps) {
    const bgColor = useColorModeValue('white', 'gray.700');
    const headerBgColor = useColorModeValue('gray.50', 'gray.600');

    // 获取所有角色ID（去重）
    const allUnitIds = useMemo(() => {
        const unitIds = new Set<number>();
        data?.all_data?.forEach((account) => {
            account.units.forEach((unit) => {
                unitIds.add(unit.unit_id);
            });
        });
        return Array.from(unitIds).sort((a, b) => a - b);
    }, [data]);

    const accountUnitsMap = useMemo(() => {
        // 定义一个类型，避免使用索引访问可能为undefined的数组
        type UnitType = BoxTableData['all_data'][0]['units'][0];
        const map = new Map<number, Map<number, UnitType>>();

        data?.all_data?.forEach((account) => {
            const unitMap = new Map<number, (typeof account.units)[0]>();
            account.units.forEach((unit) => {
                unitMap.set(unit.unit_id, unit);
            });
            map.set(account.uid, unitMap);
        });

        return map;
    }, [data]);

    // 获取角色名称映射
    const unitNameMap = useMemo(() => {
        const nameMap = new Map<number, string>();
        data?.all_data?.forEach((account) => {
            account.units.forEach((unit) => {
                if (unit.unit_name) {
                    nameMap.set(unit.unit_id, unit.unit_name);
                }
            });
        });
        return nameMap;
    }, [data]);

    // Now you can have conditional returns
    if (!data?.all_data?.length) {
        return <Text>没有找到角色练度数据</Text>;
    }

    return (
        <Tabs variant="soft-rounded" colorScheme="teal" isLazy>
            <TabList>
                <Tab>账号概览</Tab>
                <Tab>角色练度对比</Tab>
            </TabList>

            <TabPanels>
                <TabPanel>
                    <TableContainer rounded={'lg'} bg={bgColor} boxShadow={'lg'} mb={4}>
                        <Table size="sm" variant="striped" colorScheme="teal">
                            <Thead bg={headerBgColor}>
                                <Tr>
                                    <Th>序号</Th>
                                    <Th>用户名</Th>
                                    <Th>UID</Th>
                                    <Th>数据时间</Th>
                                    <Th>钻石</Th>
                                    <Th>母猪石</Th>
                                    <Th>星球杯</Th>
                                    <Th>心碎</Th>
                                    <Th>角色数量</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {data.accounts_table.map((account, index) => (
                                    <Tr key={index} fontWeight={account.UID === data.current_uid ? 'bold' : 'normal'}>
                                        <Td>{account.序号}</Td>
                                        <Td>{account.用户名}</Td>
                                        <Td>{account.UID}</Td>
                                        <Td>{account.数据时间}</Td>
                                        <Td>{account.钻石}</Td>
                                        <Td>{account.母猪石}</Td>
                                        <Td>{account.星球杯}</Td>
                                        <Td>{account.心碎}</Td>
                                        <Td>{account.角色数量}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                <TabPanel>
                    <Box mb={4}>
                        <Heading size="sm" mb={2}>
                            共 {data.all_data.length} 个账号，{allUnitIds.length} 个角色
                        </Heading>
                    </Box>
                    <TableContainer rounded={'lg'} bg={bgColor} boxShadow={'lg'} overflowX="auto" maxHeight="70vh">
                        <Table size="sm" variant="striped" colorScheme="teal">
                            <Thead position="sticky" top={0} zIndex={1} bg={headerBgColor}>
                                <Tr>
                                    <Th position="sticky" left={0} zIndex={2} bg={headerBgColor}>
                                        用户名
                                    </Th>
                                    {allUnitIds.map((unitId) => {
                                        // 获取角色名
                                        const unitName = unitNameMap.get(unitId) ?? `角色${unitId}`;

                                        return (
                                            <Th key={unitId}>
                                                <Tooltip label={`ID: ${unitId}`}>{unitName}</Tooltip>
                                            </Th>
                                        );
                                    })}
                                </Tr>
                            </Thead>
                            <Tbody>
                                {data.all_data.map((account) => (
                                    <Tr key={account.uid} fontWeight={account.uid === data.current_uid ? 'bold' : 'normal'}>
                                        <Td position="sticky" left={0} zIndex={1} >
                                            {account.user_name}
                                        </Td>
                                        {allUnitIds.map((unitId) => {
                                            const unitMap = accountUnitsMap.get(account.uid);
                                            const unit = unitMap?.get(unitId);

                                            return (
                                                <Td key={unitId}>
                                                    {unit ? (
                                                        <Tooltip
                                                            label={
                                                                `等级: ${unit.level ?? '-'}\n` +
                                                                `Rank: ${unit.rank ?? '-'}\n` +
                                                                `装备: ${unit.equip ?? '-'}\n` +
                                                                `UB: ${unit.ub ?? '-'}\n` +
                                                                `技能1: ${unit.sk1 ?? '-'}\n` +
                                                                `技能2: ${unit.sk2 ?? '-'}\n` +
                                                                `EX: ${unit.ex ?? '-'}\n` +
                                                                `专武: ${unit.unique_equip ?? '-'}\n` +
                                                                `碎片: ${unit.memory ?? '-'}\n` +
                                                                `金碎: ${unit.pure_memory ?? '-'}`
                                                            }
                                                            placement="top"
                                                        >
                                                            {unit.owned ? <Badge colorScheme={unit.rarity && unit.rarity >= 5 ? 'purple' : 'blue'}>{unit.rarity}★</Badge> : <Badge colorScheme="red">未拥有</Badge>}
                                                        </Tooltip>
                                                    ) : (
                                                        <Badge colorScheme="gray">-</Badge>
                                                    )}
                                                </Td>
                                            );
                                        })}
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            </TabPanels>
        </Tabs>
    );
}
