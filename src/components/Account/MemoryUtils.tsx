// 纯净碎片数据接口
export interface MemoryItem {
    characterName: string;
    accounts: {
        accountName: string;
        status: string;
        isDeficit: boolean;
    }[];
}

// 解析纯净碎片表格数据
export function parseMemoryTable(log: string): { items: MemoryItem[]; accountNames: string[] } {
    if (!log) return { items: [], accountNames: [] };

    const characterMap = new Map<string, Map<string, { status: string; isDeficit: boolean }>>();
    const accountNames = new Set<string>();

    // 提取所有用户数据块
    const userDataRegex = /===(.+?)===\s*\n\[.*?\]\s*\n([\s\S]*?)(?====|$)/g;
    let match;
    let hasMatches = false;

    while ((match = userDataRegex.exec(log)) !== null) {
        hasMatches = true;
        const accountName = match[1].trim();
        const userData = match[2].trim();
        const userLines = userData.split('\n');

        accountNames.add(accountName);

        // 处理每一行数据
        userLines.forEach((line) => {
            const parts = line.split(': ');
            if (parts.length >= 2) {
                const characterName = parts[0].trim();
                const status = parts[1].trim();
                const isDeficit = status.includes('缺少');

                if (!characterMap.has(characterName)) {
                    characterMap.set(characterName, new Map());
                }
                characterMap.get(characterName)!.set(accountName, { status, isDeficit });
            }
        });
    }
    // 如果没有匹配到===用户名===格式，则将整个log作为默认用户的数据处理
    if (!hasMatches) {
        const defaultAccountName = ''; // 默认用户名为空
        accountNames.add(defaultAccountName);

        // 按行处理整个log
        const lines = log.split('\n');
        lines.forEach((line) => {
            const parts = line.split(': ');
            if (parts.length >= 2) {
                const characterName = parts[0].trim();
                const status = parts[1].trim();
                const isDeficit = status.includes('缺少');

                if (!characterMap.has(characterName)) {
                    characterMap.set(characterName, new Map());
                }
                characterMap.get(characterName)!.set(defaultAccountName, { status, isDeficit });
            }
        });
    }
    // 确保至少有一个账号
    if (accountNames.size === 0) {
        accountNames.add('默认账号');
    }

    // 转换为数组格式
    const items: MemoryItem[] = [];
    const sortedAccountNames = Array.from(accountNames);

    characterMap.forEach((accountMap, characterName) => {
        const accounts = sortedAccountNames.map((accountName) => ({
            accountName,
            status: accountMap.get(accountName)?.status ?? '无数据',
            isDeficit: accountMap.get(accountName)?.isDeficit ?? false,
        }));

        items.push({ characterName, accounts });
    });

    return {
        items,
        accountNames: sortedAccountNames,
    };
}