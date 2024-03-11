import { RouterProvider, createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

// Set up a Router instance
const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: {
    },
})

// Register things for typesafety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

function InnerApp() {
    return <RouterProvider router={router} context={{}} />
}

function App() {
    return (
        <InnerApp />
    )
}

export default App
