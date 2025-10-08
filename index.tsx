
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { DataProvider } from './hooks/useData';
import { GuideProvider } from './hooks/useGuide';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <GuideProvider>
            <App />
          </GuideProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
