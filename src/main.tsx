import './polyfills/structuredClone'
import App from './App.tsx'
import NiceModal from '@ebay/nice-modal-react';
import { Provider } from './components/ui/provider'
import ReactDOM from 'react-dom/client'
import { Toaster } from './components/ui/toaster'

ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
    <Provider>
        <NiceModal.Provider>
            <App />
            <Toaster />
        </NiceModal.Provider>
    </Provider>
    // </React.StrictMode>,
)
