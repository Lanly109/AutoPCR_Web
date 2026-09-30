    def schedule_entries(self) -> List[dict]:
        """字段化全部日程（纯静态红标数据，不依赖账号/登录）。半月刊 module 与网站 API 共用此单一来源。
        每条：{key, category, start_time, end_time, description}
        - key: 稳定唯一标识（"类别:行主键"，hatsune+seven 同 event_id 时加 #序号），通知侧用它做已读去重
        - category: 语义类别（公会战/特别地下城/庆典/活动/...），调用方按需过滤
        - description: 与半月刊渲染文本一致的展示文案；扭蛋 fes 池带 fes| 前缀（渲染侧需剥离，见 half_schedule.do_task）
        """
        from ..module.modules.nologin import (
            ClanBattlePeriod, SecretDungeonSchedule, GachaDatum, CampaignSchedule,
            CampaignFreegacha, HatsuneSchedule, TowerSchedule, TdfSchedule,
            ColosseumScheduleData, DomeScheduleData, AbyssSchedule, CaravanSchedule,
            CharaFortuneSchedule, LoginBonusDatum, SeasonpassFoundation,
        )

        # (来源表, 工厂)；与半月刊原 schedule_sources 清单一致（顺序即渲染组内顺序）
        sources = [
            (self.clan_battle_period, lambda x: ClanBattlePeriod(x.start_time, x.end_time, "公会战")),
            (self.clan_battle_period, lambda x: ClanBattlePeriod(x.result_start, x.result_end, "公会战排名公示")),
            (self.secret_dungeon_schedule, lambda x: SecretDungeonSchedule(x.start_time, x.end_time, "特别地下城")),
            (self.seasonpass_foundation, lambda x: SeasonpassFoundation(x.name, x.start_time, x.end_time, "季卡")),
            (self.gacha_data, lambda x: GachaDatum(x.gacha_id, x.exchange_id, x.start_time, x.end_time, "扭蛋")),
            (self.campaign_schedule, lambda x: CampaignSchedule(x.id, x.campaign_category, x.value, x.start_time, x.end_time, "庆典")),
            (self.campaign_free_gacha, lambda x: CampaignFreegacha(x.campaign_id, x.start_time, x.end_time, "免费十连")),
            (self.hatsune_schedule, lambda x: HatsuneSchedule(x.event_id, x.start_time, x.end_time, "活动")),
            (self.seven_schedule, lambda x: HatsuneSchedule(x.event_id, x.start_time, x.end_time, "活动")),
            (self.tower_schedule, lambda x: TowerSchedule(x.start_time, x.end_time, "露娜塔")),
            (self.tdf_schedule, lambda x: TdfSchedule(x.start_time, x.end_time, "次元断层")),
            (self.chara_fortune_schedule, lambda x: CharaFortuneSchedule(x.name, x.start_time, x.end_time, "赛马")),
            (self.login_bonus_data, lambda x: LoginBonusDatum(x.name, x.start_time, x.end_time, "登录奖励")),
            (self.colosseum_schedule_data, lambda x: ColosseumScheduleData(x.start_time, x.end_time, "斗技场")),
            (self.caravan_schedule, lambda x: CaravanSchedule(x.season_id, x.start_time, x.end_time, "驾车游")),
            (self.dome_schedule_data, lambda x: DomeScheduleData(x.start_time, x.end_time, "新斗技场")),
            (self.abyss_schedule, lambda x: AbyssSchedule(x.talent_id, x.start_time, x.end_time, "深渊讨伐战")),
        ]

        entries: List[dict] = []
        counters: Counter = Counter()
        order = 0
        for table, factory in sources:
            # key 生成必须在 enabled 过滤之前：行从 enabled 转 disabled 时，后续行 #n 不得漂移
            for row_key, row in table.items():
                schedule = factory(row)
                # key = 语义类别 + 行主键（dict 键即行主键，不取 name 等文本列——防改名/含分隔符导致 key 漂移）
                base_key = ':'.join([schedule.description, str(row_key)])
                counters[base_key] += 1
                stable_key = base_key if counters[base_key] == 1 else base_key + '#' + str(counters[base_key])
                if not schedule.enabled:
                    continue
                desc = schedule.get_description()
                # 扭蛋条目：官方池名 gacha_name 含 フェス/FES 判定为 fes 池，织入标记供通知侧折叠（只留第一人 + fes扭蛋）；
                # 渲染侧（half_schedule.do_task）负责剥离前缀，保证半月刊输出 parity
                if schedule.description == "扭蛋":
                    gacha_name = row.gacha_name or ''
                    if ('フェス' in gacha_name) or ('FES' in gacha_name.upper()):  # 宽松子串匹配是有意的
                        desc = 'fes|' + desc
                entries.append({
                    'key': stable_key,
                    'category': schedule.description,
                    'start_time': self.format_date(self.parse_time(schedule.start_time)),
                    'end_time': self.format_date(self.parse_time(schedule.end_time)),
                    'description': desc,
                    '_order': order,
                })
                order += 1
        # 排序与半月刊旧实现一致：(start, end, 源清单顺序)——不得用 key 码点序，否则组内顺序漂移破坏 parity
        entries.sort(key=lambda e: (e['start_time'], e['end_time'], e['_order']))
        for e in entries:
            e.pop('_order')
        return entries
