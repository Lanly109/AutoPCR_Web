# autopcr/http_server/httpserver.py — 两处改动：
# ① 文件顶部 import 区（accountmgr import 之后）补（全文件当前没有 db 导入，不加必 NameError）：
#     from ..db.database import db
# ② configure_routes 内（put_clan_forbid PUT 块之后）加路由。
#    公开只读：不挂 login_required 即为公开（先例 /validate，httpserver.py:501）；
#    别学 /clan_forbid——它挂了 login+admin，不是公开路由。
@self.api.route('/schedule', methods=["GET"])
async def get_schedule():
    """半月刊结构化日程（字段化，无账号依赖）。网页端通知与本 module 渲染共用数据源。"""
    return db.schedule_entries(), 200
