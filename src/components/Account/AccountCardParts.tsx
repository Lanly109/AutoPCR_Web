/** 账号卡片/表格行共享的小 UI 件（自 AccountCard 拆出，两视图复用） */

import { Spinner, Tag } from '@chakra-ui/react';
import { Checkbox } from '../ui/checkbox';

/** 圆形勾选框：表格行与卡片头部共用同一形状 */
export function RoundCheckbox({ checked, onToggle }: { checked?: boolean; onToggle?: () => void }) {
    return (
        <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            colorPalette="blue"
            size="md"
            css={{
                '& [data-part=control], & .chakra-checkbox__control': {
                    borderRadius: '9999px',
                    width: '1.25rem',
                    height: '1.25rem',
                },
            }}
        />
    );
}

/** 「默认」「公会战禁用」标签组。compact=表格行（禁用用 solid+全称），否则卡片（subtle+短词） */
export function AccountTags({ isDefault, clanForbid, compact }: { isDefault: boolean; clanForbid?: boolean; compact?: boolean }) {
    return (
        <>
            {isDefault && (
                <Tag.Root size="sm" p={0.5} colorPalette="purple" variant="solid" flexShrink={0}>
                    <Tag.Label fontSize="2xs" lineHeight="1" whiteSpace="nowrap">默认</Tag.Label>
                </Tag.Root>
            )}
            {clanForbid && (
                <Tag.Root size="sm" p={0.5} colorPalette="red" variant={compact ? 'solid' : 'subtle'} flexShrink={0}>
                    <Tag.Label fontSize="2xs" lineHeight="1" whiteSpace="nowrap">{compact ? '公会战禁用' : '禁用'}</Tag.Label>
                </Tag.Root>
            )}
        </>
    );
}

/** 状态标签：执行中转圈，否则显示最近状态 */
export function StatusTag({ isBusy, color, icon, label }: { isBusy?: boolean; color: string; icon?: React.ReactNode; label: string }) {
    if (isBusy) {
        return (
            <Tag.Root colorPalette="blue" variant="subtle" flexShrink={0}>
                <Tag.StartElement css={{ boxSize: 'auto', ms: 0, display: 'flex', alignItems: 'center' }}>
                    <Spinner size="xs" />
                </Tag.StartElement>
                <Tag.Label>执行中</Tag.Label>
            </Tag.Root>
        );
    }
    return (
        <Tag.Root colorPalette={color} variant="subtle" flexShrink={0}>
            <Tag.StartElement>{icon}</Tag.StartElement>
            <Tag.Label>{label}</Tag.Label>
        </Tag.Root>
    );
}
