import Nav from '@components/SideBar/Index'
import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/daily/_sidebar')({
    component: Nav
})
