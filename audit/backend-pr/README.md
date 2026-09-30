# 半月刊字段化 — 后端 PR 素材（提交流程说明）

## 背景
Discord 讨论定案：半月刊（half_schedule, `autopcr/module/modules/nologin.py`）的解析逻辑
挪进 `db`（database.py）返回结构化数据，供 module 渲染与网站 API 共用；网页端基于此做
「复刻活动/特别地下城/新斗技场/公会战开启」通知，不再依赖运行任务读警报。

## 重要约束（为什么这个目录里只有素材没有直接改动）
后端仓库 U:\autopcr（cc004/autopcr，dev 分支）正在被本机 Docker 容器运行，工作区不能直接改。
本目录保存已完成的设计与代码素材，PR 需要在后端仓库的独立分支上落地。

## 提 PR 步骤（在后端仓库做）
1. cd U:\autopcr
2. git checkout -b feat/schedule-entries origin/dev
3. 按本目录两个 .py 素材文件落改动：
   - database_schedule_entries.py 的方法体 → 粘进 autopcr/db/database.py 的
     database 类（放 is_clan_battle_time 之前即可；List/Counter 已在文件头有 import）
   - nologin_half_schedule.py 的 do_task → 替换 autopcr/module/modules/nologin.py
     half_schedule 类里现有的 do_task（schedule_sources 静态方法可保留，已无消费者，也可一并删）
4. 本地验证：
   - python -c "from autopcr.db.dbstart import db_start; db_start(); from autopcr.db.database import db; e=db.schedule_entries(); print(len(e), e[0])"
     （必须先 db_start()：lazy_property 在 dbmgr 未初始化时直接抛 ValueError；db_start 会连带拉起登录依赖，属预期）
   - 跑一次半月刊 module，输出应与改动前逐行一致（排序键 (start, end, 源清单顺序)，组内顺序=源清单顺序）
5. httpserver.py 加只读端点（不挂 login_required 装饰器即为公开，与 /validate 同风格；
   注意 /clan_forbid 其实带 login+admin，别学它）：
   @self.api.route('/schedule', methods=["GET"])
   async def get_schedule():
       return db.schedule_entries(), 200
   （注意 schedule_entries 每次调用都全表扫 17 张红标表，量级小可接受；若在意可加 lazy_property 缓存，
    但 enabled 依赖当前时间，缓存须带 TTL——首版建议不加）
6. git add autopcr/db/database.py autopcr/module/modules/nologin.py autopcr/http_server/httpserver.py
   git commit；push 到自己 fork 或分支；向 cc004/autopcr 提 PR。

## 字段化数据形状
每条日程：{ key, category, start_time, end_time, description }
- key：稳定唯一（"类别:来源主键"，同主键多来源加 #序号），通知侧已读去重直接用它
- category：半月刊渲染的类别名（公会战/特别地下城/新斗技场/庆典/活动/扭蛋/...）
- start_time / end_time：YYYY/MM/DD（与半月刊渲染一致）
- description：与半月刊逐行渲染完全相同的文本（up 名单、掉落倍率等都在这里面）；
  扭蛋条目若 gacha_name 含 フェス/FES，前缀加 fes|（前端折叠为「up 首人 fes扭蛋」）

## 前端侧状态（已在 AutoPCR_Web 实现，等后端 API 合入即切换）
- GET /daily/api/schedule → ScheduleEntry[]（vite proxy 指向真后端即自动生效，前端零改动）
- ScheduleNotifyWatcher（挂 _sidebar）+ 面板（DashBoard 工具栏）：
  - 展示口径：end_time > 今天 的条目；噪声过滤（玩家经验值加成、公会战排名公示整类）
  - 类别：固定清单 13 类（活动/女神祭/庆典/扭蛋/免费十连/公会战/特别地下城/新斗技场/季卡驾车游/露娜塔/次元断层/深渊讨伐战/赛马）；
    驾车游并入季卡、斗技场/登录奖励前端不显示；女神祭由 description 含「女神祭」从活动拆出
  - 扭蛋折叠：description 带 fes| 前缀（= gacha_name 含 フェス/FES，由后端 schedule_entries 织入）→「up 首人 fes扭蛋」；
    普通长名单 →「up 前两名……等N人」
- 通知：勾选类别条目 start_time == 今天 且到设定时刻 → 浏览器通知（每 key 当天一次，localStorage 已读 90 天自清理）
