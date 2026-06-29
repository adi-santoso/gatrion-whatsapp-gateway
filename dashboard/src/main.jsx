import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import Login from './pages/Login.jsx';
import './index.css';

// Check if user is authenticated
const apiKey = localStorage.getItem('apiKey');

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <BrowserRouter basename="/dashboard">
      {apiKey ? <App /> : <Login />}
    </BrowserRouter>
  </React.StrictMode>
);
