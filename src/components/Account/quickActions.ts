/** 主页工具栏自定义功能按钮：本地存储（与收藏星标同等待遇） */

export interface QuickActionItem {
    /** 功能的模块 key（唯一标识，后端改名不影响） */
    key: string;
    /** 显示名（每次以服务器实时数据为准，这里只是缓存） */
    name: string;
    areaKey: string;
    areaName: string;
    /** 危险分区的功能，执行前要确认 */
    dangerous: boolean;
}

const KEY = 'autopcr_quickActions_v1';
const VERSION = 1;

/** 读取：损坏/被清一律按空列表处理，绝不抛错 */
export function loadQuickActions(): QuickActionItem[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { version?: number; buttons?: unknown };
        if (parsed?.version !== VERSION || !Array.isArray(parsed.buttons)) return [];
        return parsed.buttons
            .filter(
                (b): b is QuickActionItem =>
                    !!b && typeof (b as QuickActionItem).key === 'string' && typeof (b as QuickActionItem).name === 'string',
            )
            .map((b) => ({
                // 只取已知字段：未知属性不透传（类型谓词只验了 key/name，展开会把垃圾字段带回）
                key: b.key,
                name: b.name,
                areaKey: typeof b.areaKey === 'string' ? b.areaKey : '',
                areaName: typeof b.areaName === 'string' ? b.areaName : '',
                dangerous: b.dangerous === true, // 只认显式 true（旧缓存字段缺失不误判危险）
            }));
    } catch {
        return [];
    }
}

/** 写入：失败（隐私模式/已满）返回 false，由调用方提示 */
export function saveQuickActions(items: QuickActionItem[]): boolean {
    try {
        localStorage.setItem(KEY, JSON.stringify({ version: VERSION, buttons: items }));
        return true;
    } catch {
        return false;
    }
}
