import { createFileRoute, redirect } from '@tanstack/react-router'
import { Route as AccountRoute } from '@routes/daily/_sidebar/account/index'

// 打开 /daily/ 根路径时自动带到账号主页；
// 未登录时账号主页的请求会 401，全局拦截器会自动送去登录页。
export const Route = createFileRoute('/daily/')({
    beforeLoad: () => {
        throw redirect({ to: AccountRoute.to })
    },
})
