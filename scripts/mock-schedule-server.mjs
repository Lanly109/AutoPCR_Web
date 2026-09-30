/**
 * 半月刊 /schedule 联调 mock：数据逐条对照真实半月刊页面（2026/09/10 时点快照）。
 * 用法：node scripts/mock-schedule-server.mjs → 监听 13201；配合 AUTOPCR_SERVER_HOST=http://localhost:13201 起 vite。
 */
import { createServer } from 'node:http';

const rows = [
    { key: '季卡:1', category: '季卡', start_time: '2026/07/01', end_time: '2026/09/15', description: '驾车游第9季' },
    { key: '扭蛋:2', category: '扭蛋', start_time: '2026/08/31', end_time: '2026/09/08', description: 'up 艾拉,紫罗兰,菲欧,格蕾丝,白菲,涅妃,银莲,els,琉璃,莱莱,机娘,坏女人,龙安,爱梅斯,咲哈哈,兰法,小小甜心,龙妈,星栞,风剑,白猫,火猫,晶,飞田,蝶妈,高达,似似花,611,克总' },
    { key: '活动:3', category: '活动', start_time: '2026/08/31', end_time: '2026/09/23', description: ', And I Will　\n牢牢紧握在手中' },
    { key: '活动:4', category: '活动', start_time: '2026/08/31', end_time: '2026/10/30', description: '女神祭' },
    { key: '庆典:5', category: '庆典', start_time: '2026/09/01', end_time: '2026/09/23', description: '活动 玩家经验值*1.5' },
    { key: '庆典:6', category: '庆典', start_time: '2026/09/07', end_time: '2026/09/15', description: '圣迹 掉落*2.0' },
    { key: '庆典:7', category: '庆典', start_time: '2026/09/07', end_time: '2026/09/15', description: '神殿 掉落*2.0' },
    { key: '庆典:8', category: '庆典', start_time: '2026/09/07', end_time: '2026/09/24', description: 'vh 掉落*2.0' },
    { key: '庆典:9', category: '庆典', start_time: '2026/09/07', end_time: '2026/09/24', description: 'vh mana*2.0' },
    { key: '公会战排名公示:10', category: '公会战排名公示', start_time: '2026/09/07', end_time: '2026/09/28', description: '公会战排名公示' },
    { key: '新斗技场:11', category: '新斗技场', start_time: '2026/09/08', end_time: '2026/09/12', description: '新斗技场' },
    { key: '扭蛋:12', category: '扭蛋', start_time: '2026/09/08', end_time: '2026/09/15', description: 'up 诗夏,紫罗兰,菲欧,格蕾丝,白菲,涅妃,银莲,els,琉璃,莱莱,机娘,坏女人,龙安,爱梅斯,咲哈哈,兰法,小小甜心,龙妈,星栞,风剑,白猫,火猫,晶,飞田,蝶妈,高达,似似花,611,克总' },
    { key: '庆典:13', category: '庆典', start_time: '2026/09/15', end_time: '2026/09/20', description: 'normal 掉落*3.0' },
    { key: '庆典:14', category: '庆典', start_time: '2026/09/15', end_time: '2026/09/29', description: '地下城 mana*2.0' },
    { key: '活动:15', category: '活动', start_time: '2026/09/16', end_time: '2026/09/23', description: '幻惑的妖精　\n‐盛夏乐园中舞动的身影‐' },
    { key: '公会战:16', category: '公会战', start_time: '2026/09/26', end_time: '2026/09/30', description: '公会战' },
    { key: '公会战排名公示:17', category: '公会战排名公示', start_time: '2026/10/07', end_time: '2026/10/28', description: '公会战排名公示' },
];
createServer((req, res) => {
    const url = req.url ?? '';
    if (url.startsWith('/daily/api/schedule')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
        return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{}');
}).listen(13201, () => console.log('mock schedule server on http://localhost:13201'));
