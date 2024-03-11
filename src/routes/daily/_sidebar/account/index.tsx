import { DashBoard } from '@components/Account/DashBoard'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/daily/_sidebar/account/')({
    component: DashBoard,
})

