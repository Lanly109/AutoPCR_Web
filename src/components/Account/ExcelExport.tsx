import { Button, useToast } from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';

// 简化的数据接口
interface UserInfo {
    user_name: string;
    user_id: number;
    data_time: string;
    jewel: number;
    mother_stone: number;
    star_cup: number;
    heart_fragment: number;
}
interface UnitData {
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
}
interface ExcelData {
    user_info: UserInfo;
    units: UnitData[];
}
interface ExcelExportProps {
    logContent: string | undefined;
    fileName?: string;
}

// 单元格类型
type CellValue = string | number | { v: string | number; t: string; s?: { alignment?: { horizontal: string } } };

export function ExcelExport({ logContent, fileName = 'box_data' }: ExcelExportProps) {
    const toast = useToast();
    const createCell = (value: string | number, align = 'center'): CellValue => ({ v: value, t: 's', s: { alignment: { horizontal: align } } });
    const showToast = (title: string, desc: string, status: 'error' | 'success') => toast({ title, description: desc, status, duration: 3000, isClosable: true });

    const handleExport = () => {
        if (!logContent) {
            showToast('导出失败', '没有找到可导出的数据', 'error');
            return;
        }

        try {
            // 解析数据
            const matches = Array.from(logContent.matchAll(/BOX_EXCEL_DATA: ({[\s\S]*?})(?=\n|$)/g));
            if (matches.length === 0) {
                showToast('导出失败', '无法解析数据格式', 'error');
                return;
            }

            // 解析用户数据
            const allUserData: ExcelData[] = [];
            matches.forEach((match) => {
                if (match[1])
                    try {
                        allUserData.push(JSON.parse(match[1].trim()) as ExcelData);
                    } catch (err) {
                        console.error('解析错误:', err);
                    }
            });
            if (allUserData.length === 0) {
                showToast('导出失败', '没有成功解析任何数据', 'error');
                return;
            }

            // 创建Excel和收集角色信息
            const wb = XLSX.utils.book_new(),
                worksheet = XLSX.utils.aoa_to_sheet([]);
            const unitMap = new Map<number, string>();
            allUserData.forEach((userData) =>
                userData.units.forEach((unit) => {
                    if (!unitMap.has(unit.unit_id)) unitMap.set(unit.unit_id, unit.unit_name);
                })
            );
            const UnitIds = Array.from(unitMap.keys());

            // 创建表头
            const baseHeaders = ['序号', '用户名', 'UID', '数据时间', '钻石', '母猪石', '星球杯', '心碎'];
            const headerRow1 = baseHeaders.map((t) => createCell(t, 'left'));
            const headerRow2 = Array(8).fill(createCell('', 'left'));
            const attrNames = ['', '星级', '等级', 'rank', '装备', 'ub', 'sk1', 'sk2', 'ex', '专武', '碎片', '金碎'];

            // 添加角色列到表头
            UnitIds.forEach((unitId) => {
                const unitName = unitMap.get(unitId) ?? `角色${unitId}`;
                for (let i = 0; i < 12; i++) headerRow1.push(createCell(i === 1 ? unitName : '', 'center'));
                attrNames.forEach((attr) => headerRow2.push(createCell(attr, 'center')));
            });

            // 添加表头和数据行
            const addCellToSheet = (cell: CellValue, r: number, c: number) => {
                worksheet[XLSX.utils.encode_cell({ r, c })] = typeof cell === 'string' || typeof cell === 'number' ? { v: cell, t: 's', s: { alignment: { horizontal: c < 8 ? 'left' : 'center' } } } : cell;
            };

            // 添加表头
            [headerRow1, headerRow2].forEach((row, rowIndex) => row.forEach((cell, colIndex) => addCellToSheet(cell as CellValue, rowIndex, colIndex)));
            // 添加数据行
            allUserData.forEach((userData, userIndex) => {
                // 基本信息
                const baseInfo = [
                    userIndex + 1,
                    userData.user_info.user_name,
                    userData.user_info.user_id,
                    userData.user_info.data_time,
                    userData.user_info.jewel,
                    userData.user_info.mother_stone,
                    userData.user_info.star_cup,
                    userData.user_info.heart_fragment,
                ];
                baseInfo.forEach((v, i) => addCellToSheet(createCell(v, i < 8 ? 'left' : 'center'), userIndex + 2, i));

                // 角色数据
                let colOffset = 8;
                UnitIds.forEach((unitId) => {
                    const unit = userData.units.find((u) => u.unit_id === unitId);
                    addCellToSheet(createCell('', 'center'), userIndex + 2, colOffset++);

                    if (unit?.owned) {
                        [unit.rarity, unit.level, unit.rank, unit.equip, unit.ub, unit.sk1, unit.sk2, unit.ex, unit.unique_equip, unit.memory, unit.pure_memory].forEach((attr) =>
                            addCellToSheet(createCell(attr ?? '-', 'center'), userIndex + 2, colOffset++)
                        );
                    } else {
                        for (let i = 0; i < 11; i++) addCellToSheet(createCell('-', 'center'), userIndex + 2, colOffset++);
                    }
                });
            });

            // 设置工作表属性
            worksheet['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headerRow1.length - 1, r: allUserData.length + 1 } });
            worksheet['!cols'] = [
                ...Array(8)
                    .fill(0)
                    .map((_, i) => ({ wch: i === 0 ? 4 : i < 4 ? 15 : 8 })),
                ...Array(UnitIds.length * 12).fill({ wch: 8 }),
            ];
            worksheet['!merges'] = [];
            worksheet['!freeze'] = { xSplit: 8, ySplit: 2 };

            // 导出文件
            XLSX.utils.book_append_sheet(wb, worksheet, '角色数据');
            const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[/\s:]/g, '-');

            XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
            showToast('导出成功', `已成功导出${allUserData.length}个用户的角色数据`, 'success');
        } catch (error) {
            console.error('导出Excel失败:', error);
            showToast('导出失败', `导出Excel时发生错误: ${(error as Error).message}`, 'error');
        }
    };

    return (
        <Button leftIcon={<FiDownload />} colorScheme="teal" size="sm" onClick={handleExport} isDisabled={!logContent}>
            导出Excel
        </Button>
    );
}
