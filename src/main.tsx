import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ChakraProvider } from '@chakra-ui/react'
import NiceModal from '@ebay/nice-modal-react';
import theme from './theme'


ReactDOM.createRoot(document.getElementById('root')!).render(
    // <React.StrictMode>
    <ChakraProvider toastOptions={{ defaultOptions: { position: 'top', duration: 2500 } }} theme={theme}>
        <NiceModal.Provider>
            <App />
        </NiceModal.Provider>
    </ChakraProvider>
    // </React.StrictMode>,
)
