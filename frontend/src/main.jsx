import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import 'dayjs/locale/es.js';
import 'react-toastify/dist/ReactToastify.css';
import App from './App.jsx';
import { AppointmentsProvider } from './context/AppointmentsContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { applyTheme, getStoredTheme } from './utils/theme.js';
import './styles.css';

dayjs.locale('es');
dayjs.extend(utc);

// Se aplica antes del render para evitar el parpadeo inicial.
applyTheme(getStoredTheme());

function ThemedToasts() {
  const { resolved } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme={resolved === 'dark' ? 'dark' : 'light'}
      toastClassName="aura-toast"
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppointmentsProvider>
            <App />
            <ThemedToasts />
          </AppointmentsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
