import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
    component: () => (
        <div id="ok">
            <Outlet />
        </div>
    ),
})
