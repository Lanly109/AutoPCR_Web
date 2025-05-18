import { iTableResult } from '@interfaces/ModuleResult';
import { Flex, HStack, Button, Box } from '@chakra-ui/react';
import TableResultModal from './TableResult';
import ExcelExport from './ExcelExport';
import NiceModal from '@ebay/nice-modal-react';

export function TableResultWrapper({ header, data }: iTableResult) {

    return (
        <Box>
            <Flex direction="column" gap={4}>
                <HStack>
                    <Button onClick={async () => {
                        await NiceModal.show(TableResultModal, { header: header, data: data });
                    }}>
                        展示表格
                    </Button>
                    <ExcelExport header={header} data={data} />
                </HStack>
            </Flex>
        </Box >
    )

}
