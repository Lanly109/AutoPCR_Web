const fs = require('fs');
const root = 'U:/autopcr/web/autopcr-main';
const mat = fs.readFileSync('U:/autopcr/web/AutoPCR_Web/audit/backend-pr/database_schedule_entries.py', 'utf8');

// 1) database.py
const dbp = root + '/autopcr/db/database.py';
let db = fs.readFileSync(dbp, 'utf8');
if (db.includes('def schedule_entries')) {
  console.log('database.py: schedule_entries already present');
} else {
  const marker = '    def is_clan_battle_time(self, now: Union[None, datetime.datetime] = None) -> bool:';
  const i = db.indexOf(marker);
  if (i === -1) throw new Error('is_clan_battle_time marker not found');
  db = db.slice(0, i) + mat.replace(/\n$/, '') + '\n\n' + db.slice(i);
  fs.writeFileSync(dbp, db, 'utf8');
  console.log('database.py: schedule_entries inserted');
}

// 2) httpserver.py
const hpp = root + '/autopcr/http_server/httpserver.py';
let hp = fs.readFileSync(hpp, 'utf8');
if (!hp.includes('from ..db.database import db')) {
  const m2 = hp.match(/(from \.\.constants import[^\n]*\n)/);
  if (!m2) throw new Error('constants import anchor not found');
  hp = hp.replace(m2[1], m2[1] + 'from ..db.database import db\n');
  console.log('httpserver.py: db import added');
}
if (!hp.includes("'/schedule'")) {
  const pf = hp.indexOf('async def put_clan_forbid():');
  if (pf === -1) throw new Error('put_clan_forbid not found');
  const retMark = "return f'设置成功，禁止了{len(data)}个账号', 200";
  const ri = hp.indexOf(retMark, pf);
  if (ri === -1) throw new Error('put_clan_forbid return not found');
  const insertAt = hp.indexOf('\n', ri) + 1;
  const route = [
    '',
    "        @self.api.route('/schedule', methods = [\"GET\"])",
    '        async def get_schedule():',
    '            """半月刊结构化日程（字段化，无账号依赖）。网页端通知与本 module 渲染共用数据源。"""',
    '            return db.schedule_entries(), 200',
  ].join('\n') + '\n';
  hp = hp.slice(0, insertAt) + route + hp.slice(insertAt);
  console.log('httpserver.py: /schedule route added');
}
fs.writeFileSync(hpp, hp, 'utf8');

// 3) nologin.py do_task
const nlp = root + '/autopcr/module/modules/nologin.py';
let nl = fs.readFileSync(nlp, 'utf8');
if (nl.includes('db.schedule_entries()')) {
  console.log('nologin.py: do_task already consumes schedule_entries');
} else {
  const start = nl.indexOf('    async def do_task(self, _: pcrclient):', nl.indexOf('class half_schedule'));
  if (start === -1) throw new Error('half_schedule.do_task not found');
  const tailMark = 'self._log(f"    {msg}")';
  const ti = nl.indexOf(tailMark, start);
  if (ti === -1) throw new Error('do_task tail not found');
  const end = nl.indexOf('\n', ti) + 1;
  const newDo = [
    '    async def do_task(self, _: pcrclient):',
    '        # 结构化数据单一来源：db.schedule_entries()（字段化供 API/通知复用），这里只做渲染',
    '        schedules = defaultdict(list)',
    '        for entry in db.schedule_entries():',
    "            msg = entry['description']",
    "            if msg.startswith('fes|'):",
    '                msg = msg[4:]  # 剥离 fes 标记（通知侧契约），半月刊渲染保持 parity',
    "            schedules[(entry['start_time'], entry['end_time'])].append(msg)",
    '        times = sorted(schedules.keys())',
    '        mirai = False',
    '        for time in times:',
    '            st = time[0]',
    '            ed = time[1]',
    '            if not mirai and db.parse_time(st) > datetime.now():',
    '                mirai = True',
    '                self._log("\\n====未来日程====")',
    '            self._log(f"{st} - {ed}")',
    '            for msg in schedules[time]:',
    '                self._log(f"    {msg}")',
  ].join('\n') + '\n';
  nl = nl.slice(0, start) + newDo + nl.slice(end);
  fs.writeFileSync(nlp, nl, 'utf8');
  console.log('nologin.py: do_task replaced');
}
console.log('ALL DONE');
