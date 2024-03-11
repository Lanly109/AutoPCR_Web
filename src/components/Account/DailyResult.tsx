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
} from '@chakra-ui/react'

export interface DailyResultProps {
    resultData: ModuleResultResponse
}
interface ModuleResultProps extends TableRowProps {
    resultData: ModuleResultInterface
    index: number
}

export function DailyResultTable({ resultData }: DailyResultProps) {
    return (
        <TableContainer rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'}>
            <Table variant='striped' colorScheme='teal'>
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
                            return <ModuleResult key={module} index={index} resultData={resultData.result.get(module)!} />
                        })
                    }
                </Tbody>
            </Table>
        </TableContainer >

    )
}

export function ModuleResult({ resultData, index, ...rest }: ModuleResultProps) {

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
