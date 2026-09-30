    async def do_task(self, _: pcrclient):
        # 结构化数据单一来源：db.schedule_entries()（字段化供 API/通知复用），这里只做渲染
        schedules = defaultdict(list)
        for entry in db.schedule_entries():
            schedules[(entry['start_time'], entry['end_time'])].append(entry['description'])
        times = sorted(schedules.keys())
        mirai = False
        for time in times:
            st = time[0]
            ed = time[1]
            if not mirai and db.parse_time(st) > datetime.now():
                mirai = True
                self._log("\n====未来日程====")
            self._log(f"{st} - {ed}")
            for msg in schedules[time]:
                if msg.startswith('fes|'):
                    msg = msg[4:]  # 剥离 fes 标记（API 契约字段，半月刊渲染不带前缀，保持 parity）
                self._log(f"    {msg}")
