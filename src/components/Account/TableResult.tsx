import { DataItem, HeaderItem, iTableResult } from '@interfaces/ModuleResult';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, useColorModeValue, Box, Flex } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

type SortConfig = {
    key: string
    direction: 'asc' | 'desc'
} | null

interface HeaderColumn {
    header: HeaderItem
    parent: string
}

export function TableResult({ header, data }: iTableResult) {
    const color1 = useColorModeValue('blue.50', 'blue.900');
    const color2 = useColorModeValue('green.50', 'green.900');

    const [sortConfig, setSortConfig] = useState<SortConfig>(null)

    const getByPath = (row: DataItem, path: string): DataItem | null => {
        const keys = path.split('.');
        let acc: DataItem | null = row;
        for (const key of keys) {
            if (acc !== null && typeof acc === 'object') {
                if (key in acc) {
                    acc = (acc as Record<string, DataItem>)[key];
                    continue;
                }
            }
            return null;
        }
        return acc;
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data
        const { key, direction } = sortConfig
        return [...data].sort((a, b) => {
            const va = getByPath(a, key);
            const vb = getByPath(b, key);
            if (typeof va === 'number' && typeof vb === 'number') {
                return direction === 'asc' ? va - vb : vb - va
            }
            const sa = String(va), sb = String(vb)
            return direction === 'asc'
                ? sa.localeCompare(sb)
                : sb.localeCompare(sa)
        })
    }, [data, sortConfig])

    const { maxDepth, headerRows } = useMemo(() => {

        const getDepth = (defs: HeaderItem[]): number => {
            return defs.reduce((max, h) => {
                if (typeof h === 'string') return Math.max(max, 1)
                const key = Object.keys(h)[0]
                return Math.max(max, 1 + getDepth(h[key]))
            }, 0)
        }
        const maxDepth = getDepth(header)

        const headerRows: HeaderColumn[][] = Array.from({ length: maxDepth }, () => [])
        const buildRows = (defs: HeaderItem[], level = 0, prefix = "") => {
            defs.forEach(h => {
                headerRows[level].push({ header: h, parent: prefix })
                if (typeof h !== 'string') {
                    const key = Object.keys(h)[0]
                    buildRows(h[key], level + 1, `${prefix}${key}.`)
                }
            })
        }
        buildRows(header)

        return { maxDepth, headerRows }
    }, [header]);

    const countLeaves = (defs: HeaderItem[]): number =>
        defs.reduce((sum, h) => {
            return sum + (typeof h === 'string'
                ? 1
                : countLeaves(h[Object.keys(h)[0]]))
        }, 0)

    const renderHeaderRow = (row: HeaderColumn[], level: number) => {
        const cells: React.ReactNode[] = []
        for (let i = 0; i < row.length; i++) {
            const { header, parent } = row[i]
            let label: string
            let colSpan = 1
            let rowSpan = 1
            let isLeaf = false;

            if (typeof header === 'string') {
                label = header
                rowSpan = maxDepth - level
                isLeaf = true;
            } else {
                const key = Object.keys(header)[0]
                label = key
                colSpan = countLeaves(header[key])
            }
            const sortkey = `${parent}${label}`;

            cells.push(
                <Th
                    key={`${level}-${i}`}
                    colSpan={colSpan}
                    rowSpan={rowSpan}
                    border="1px solid gray"
                    outline="1px solid gray"
                    p={1}
                    textAlign="center"
                    position={level === 0 ? 'sticky' : undefined}
                    top={level === 0 ? 0 : undefined}
                    left={i === 0 ? 0 : undefined}
                    {...(i === 0 && level === 0 ? { zIndex: 2 } : { zIndex: 0 })}
                    {...(level === 0 ? i % 2 == 0 ? { bg: color1 } : { bg: color2 } : {})}
                    {...(isLeaf ? {
                        onClick: () => {
                            setSortConfig(prev => {
                                if (prev?.key === sortkey) {
                                    return { key: sortkey, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                                }
                                return { key: sortkey, direction: 'asc' }
                            })
                        }
                    } : {})}
                >
                    <Flex alignItems="center" justifyContent="center" overflow="hidden">

                        {label}
                        {isLeaf && sortConfig?.key === sortkey && (
                            <Box as="span" ml={1}>
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </Box>
                        )}
                    </Flex>
                </Th >
            )
        }
        return <Tr key={level}>{cells}</Tr>
    }

    const renderRowCells = (
        defs: HeaderItem[],
        row: DataItem,
        ri: number,
        prefix = '',
    ): React.ReactNode[] => {
        return defs.flatMap((def, ci) => {
            if (typeof def === 'string') {
                return <Td outline="1px solid gray" key={`ceil-${def}-${prefix}-${ri}-${ci}`}>{(row as Record<string, DataItem>)[def] as string ?? ''}</Td>
            } else {
                const key = Object.keys(def)[0]
                const children = def[key]
                const groupVal = (row as Record<string, DataItem>)[key]
                if (
                    groupVal !== undefined &&
                    typeof groupVal !== 'object'
                ) {
                    return <Td outline="1px solid gray" key={`ceil-${key}-${prefix}-${ri}-${ci}`}>{groupVal}</Td>
                }
                return renderRowCells(children, groupVal || {}, ri, `${prefix}${key}.`)
            }
        })
    }

    return (
        <Box mt={4} rounded="lg" boxShadow="lg">
            <TableContainer
                rounded="lg"
                boxShadow="lg"
                overflowX="auto"
                maxHeight="70vh"
            >
                <Table size="sm" variant="unstyled" maxW="80%">
                    <Thead>
                        {headerRows.map((row, idx) => renderHeaderRow(row, idx))}
                    </Thead>
                    <Tbody>
                        {sortedData.map((row, ri) => (
                            <Tr key={ri}>
                                {renderRowCells(header, row, ri)}
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </TableContainer>
        </Box>
    );
}
