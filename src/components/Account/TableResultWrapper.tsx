import { iTableResult } from '@interfaces/ModuleResult';
import { Flex, HStack, Button, Box } from '@chakra-ui/react';
import { TableResult } from './TableResult';
import { useState } from 'react';
import ExcelExport from './ExcelExport';

export function TableResultWrapper({ header, data }: iTableResult) {
    const [showTable, setShowTable] = useState(false)

    return (
        <Box>
            <Flex direction="column" gap={4}>
                <HStack>
                    <Button onClick={() => setShowTable(prev => !prev)}>
                        {showTable ? '隐藏表格' : '展开表格'}
                    </Button>
                    <ExcelExport header={header} data={data} />
                </HStack>
                {showTable && <TableResult header={header} data={data} />}
            </Flex>
        </Box>
    )

}
