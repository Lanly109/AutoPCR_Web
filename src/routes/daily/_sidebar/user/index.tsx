import { createFileRoute } from '@tanstack/react-router'
import Users from "@components/Users/Index.tsx";

export const Route = createFileRoute('/daily/_sidebar/user/')({
    component: Users,
})

