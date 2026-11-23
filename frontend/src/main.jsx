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
import './styles.css';

dayjs.locale('es');
dayjs.extend(utc);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppointmentsProvider>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="light"
            toastClassName="aura-toast"
          />
        </AppointmentsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
