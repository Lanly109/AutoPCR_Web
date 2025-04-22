import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    TableContainer,
    Td,
} from '@chakra-ui/react';
import { MemoryItem } from './MemoryUtils';

interface MemoryTableProps {
    data: { 
        items: MemoryItem[]; 
        accountNames: string[] 
    };
}

export function MemoryTable({ data }: MemoryTableProps) {
    return (
        <TableContainer rounded={'lg'} boxShadow={'lg'}>
            <Table size="sm" variant="striped" width="100%">
                <Thead>
                    <Tr>
                        <Th width="10%">角色名</Th>
                        {data.accountNames.map((accountName, index) => (
                            <Th key={index} width={`${80 / data.accountNames.length}%`}>
                                {accountName || ''}
                            </Th>
                        ))}
                    </Tr>
                </Thead>
                <Tbody>
                    {data.items.map((item, index) => (
                        <Tr key={index}>
                            <Td width="10%">{item.characterName}</Td>
                            {item.accounts.map((account, accIndex) => (
                                <Td key={accIndex} color={account.isDeficit ? 'red.500' : 'green.500'} width={`${80 / data.accountNames.length}%`}>
                                    {account.status}
                                </Td>
                            ))}
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </TableContainer>
    );
}
