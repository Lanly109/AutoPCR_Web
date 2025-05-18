import { Fetch } from '@api/APIUtils';
import { ModuleResult as ModuleResultInterface } from '@/interfaces/ModuleResult';
import { Table, Thead, Tbody, Tr, Th, TableContainer, useColorModeValue, Td, useToast } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { TableResultWrapper } from './TableResultWrapper';

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
    const haveTable = resultData?.table?.data?.length ?? 0 > 0 ? true : false;
    return (
        <>
            <TableContainer rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'} mb={haveTable ? 4 : 0}>
                <Table size="sm" variant="striped" colorScheme="teal" width="100%">
                    <Thead>
                        <Tr>
                            <Th>名字</Th>
                            <Th>{resultData?.name}</Th>
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
                        {haveTable && resultData?.table && <Tr>
                            <Td>表格</Td>
                            <Td>
                                <TableResultWrapper {...resultData.table} />
                            </Td>
                        </Tr>
                        }
                        <Tr>
                            <Td>结果</Td>
                            <Td style={{ whiteSpace: 'pre-wrap' }}>
                                {resultData?.log}
                            </Td>
                        </Tr>
                    </Tbody>
                </Table>
            </TableContainer>
        </>
    );
}
