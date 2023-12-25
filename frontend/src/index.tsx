import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {createTheme, ThemeProvider} from '@mui/material';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const theme = createTheme({});

root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <App/>
        </ThemeProvider>
    </React.StrictMode>
);
