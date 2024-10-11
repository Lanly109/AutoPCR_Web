import { Fetch } from '@api/APIUtils'
import { ModuleResult as ModuleResultInterface, ModuleResultResponse } from '@/interfaces/ModuleResult'
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
    useColorModeValue,
    TableRowProps,
    useToast,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'

interface DailyResultProps {
    resultData: ModuleResultResponse | null
}
interface ModuleResultProps extends TableRowProps {
    resultData: ModuleResultInterface
    index: number
}

export function DailyResult({ url }: { url: string }) {
    const toast = useToast();
    const [resultData, setResultData] = useState<ModuleResultResponse | null>(null)
    useEffect(() => {
        Fetch.get<ModuleResultResponse>(url).then((response) => {
            setResultData(response.data)
        }).catch((error: AxiosError) => {
            toast({ status: 'error', title: '获取日常结果失败', description: error.response?.data as string || "网络错误" });
        });
    }, [url, toast]);
    return (
        <DailyResultTable resultData={resultData} />
    )
}

function DailyResultTable({ resultData }: DailyResultProps) {
    return (
        <TableContainer rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'}>
            <Table size='sm' variant='striped' colorScheme='teal'>
                <Thead>
                    <Tr>
                        <Th>序号</Th>
                        <Th>名字</Th>
                        <Th>配置</Th>
                        <Th>状态</Th>
                        <Th>结果</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {
                        resultData?.order?.map((module, index) => {
                            return <ModuleResult key={module} index={index} resultData={resultData.result[module]} />
                        })
                    }
                </Tbody>
            </Table>
        </TableContainer >

    )
}

function ModuleResult({ resultData, index, ...rest }: ModuleResultProps) {

    return (
        <Tr {...rest}>
            <Td> {index} </Td>
            <Td> {resultData.name} </Td>
            <Td style={{ whiteSpace: 'pre-wrap' }}>{resultData.config}</Td>
            <Td> {resultData.status} </Td>
            <Td style={{ whiteSpace: 'pre-wrap' }}>{resultData.log}</Td>
        </Tr>
    )
}
