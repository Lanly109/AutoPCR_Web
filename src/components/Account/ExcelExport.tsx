import { Button } from '@chakra-ui/react'
import { utils, writeFile, Range } from 'xlsx'
import type { DataItem, HeaderItem, iTableResult } from '@interfaces/ModuleResult'

export default function ExcelExport({ header, data }: iTableResult) {
    const getDepth = (defs: HeaderItem[]): number =>
        defs.reduce((max, h) => {
            if (typeof h === 'string') return Math.max(max, 1)
            const children = h[Object.keys(h)[0]]
            return Math.max(max, 1 + getDepth(children))
        }, 0)

    const maxDepth = getDepth(header)

    const countLeaves = (defs: HeaderItem[]): number =>
        defs.reduce((sum, h) => {
            return sum + (typeof h === 'string'
                ? 1
                : countLeaves(h[Object.keys(h)[0]]))
        }, 0)

    const headerMatrix: string[][] = Array.from({ length: maxDepth }, () => [])
    const merges: Range[] = []

    function build(defs: HeaderItem[], level = 0, colIndex = 0) {
        defs.forEach(h => {
            if (typeof h === 'string') {
                headerMatrix[level].push(h)
                for (let i = level + 1; i < maxDepth; i++) {
                    headerMatrix[i].push('')
                    merges.push({
                        s: { r: level, c: colIndex },
                        e: { r: maxDepth - 1, c: colIndex }
                    })
                }
                colIndex += 1
            } else {
                const key = Object.keys(h)[0]
                const children = h[key]
                const span = countLeaves(children)
                headerMatrix[level].push(key)
                for (let i = 1; i < span; i++) headerMatrix[level].push('')
                merges.push({
                    s: { r: level, c: colIndex },
                    e: { r: level, c: colIndex + span - 1 }
                })
                build(children, level + 1, colIndex)
                colIndex += span
            }
        })
    }
    build(header)

    const dataCells = (
        defs: HeaderItem[],
        row: DataItem
    ): (string | number)[] => {
        return defs.flatMap(def => {
            if (typeof def === 'string') {
                return (row as Record<string, DataItem>)[def] as (string | number);
            } else {
                const key = Object.keys(def)[0]
                const children = def[key]
                const groupVal = (row as Record<string, DataItem>)[key]
                if (
                    groupVal !== undefined &&
                    typeof groupVal !== 'object'
                ) {
                    return groupVal;
                }
                return dataCells(children, groupVal || {});
            }
        })
    };

    const body = data.map(row => dataCells(header, row))

    const aoa = [...headerMatrix, ...body]

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[/\s:]/g, '-');

    const handleExport = () => {
        const ws = utils.aoa_to_sheet(aoa)
        ws['!merges'] = merges
        const wb = utils.book_new()
        utils.book_append_sheet(wb, ws, 'Sheet1')
        writeFile(wb, `表格_${timestamp}.xlsx`)
    }

    return (
        <Button onClick={handleExport} colorScheme="teal">
            导出 Excel
        </Button>
    )
}

