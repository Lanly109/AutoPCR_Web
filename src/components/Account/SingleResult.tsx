import { Fetch } from '@api/APIUtils';
import { ModuleResult as ModuleResultInterface } from '@/interfaces/ModuleResult';
import { Table, Thead, Tbody, Tr, Th, TableContainer, useColorModeValue, Td, useToast } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { MemoryTable } from './MemoryTable';
import { parseMemoryTable } from './MemoryUtils';
import { DownloadLink } from './DownloadLink';
import { BoxDataTable } from './BoxDataTable';

interface SingleResultProps {
    resultData: ModuleResultInterface | null;
}

export function SingleResult({ url }: { url: string }) {
    const toast = useToast();
    const [resultData, setResultData] = useState<ModuleResultInterface | null>(null);
    useEffect(() => {
        Fetch.get<ModuleResultInterface>(url)
            .then((response) => {
                setResultData(response.data);
            })
            .catch((error: AxiosError) => {
                toast({ status: 'error', title: '获取日常结果失败', description: (error.response?.data as string) || '网络错误' });
            });
    }, [url, toast]);
    return <SingleResultTable resultData={resultData} />;
}

function SingleResultTable({ resultData }: SingleResultProps) {
    // 检查是否为需要表格显示的模块
    const tableModules = ['获取纯净碎片缺口', '获取记忆碎片缺口'];
    // 检查是否为需要显示下载链接的模块
    const downloadModules = ['导出box练度excel'];
    // 检查是否为需要显示角色练度表格的模块
    const boxDataModules = ['查box（多选）'];

    const isTableModule = resultData?.name ? tableModules.includes(resultData.name) : false;
    const isDownloadModule = resultData?.name ? downloadModules.includes(resultData.name) : false;
    const isBoxDataModule = resultData?.name ? boxDataModules.includes(resultData.name) : false;

    const tableData = isTableModule && resultData?.log ? parseMemoryTable(resultData.log) : { items: [], accountNames: [] };

    return (
        <>
            <TableContainer rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'} mb={isTableModule || isBoxDataModule ? 4 : 0}>
                <Table size="sm" variant="striped" colorScheme="teal" width="100%">
                    <Thead>
                        <Tr>
                            <Th width="30%">名字</Th>
                            <Th width="70%">{resultData?.name}</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        <Tr>
                            <Td>配置</Td>
                            <Td style={{ whiteSpace: 'pre-wrap' }}>{resultData?.config}</Td>
                        </Tr>
                        <Tr>
                            <Td>状态</Td>
                            <Td>{resultData?.status}</Td>
                        </Tr>
                        {!isTableModule && !isBoxDataModule && (
                            <Tr>
                                <Td>结果</Td>
                                <Td style={{ whiteSpace: 'pre-wrap' }}>
                                    {isDownloadModule && <DownloadLink logContent={resultData?.log} />}
                                    {isDownloadModule ? resultData?.log?.replace(/下载链接: \/[^\s]+/g, '') : resultData?.log}
                                </Td>
                            </Tr>
                        )}
                    </Tbody>
                </Table>
            </TableContainer>

            {isTableModule && tableData.items.length > 0 && <MemoryTable data={tableData} />}
            {isBoxDataModule && <BoxDataTable logContent={resultData?.log} />}
        </>
    );
}
