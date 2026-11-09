//index.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react';// Import the React module to use React functionalities
import ReactDOM from 'react-dom/client';// Import the ReactDOM library, to provide a method rendering React components into the DOM
import 'bootstrap/dist/css/bootstrap.min.css';//Import React Bootstrap
// IMPORT CSS STYLESHEETS
import './index.css';
// IMPORT CUSTOM COMPONENTS
import App from './App';
import reportWebVitals from './reportWebVitals';//Import reportWebVitals function from './reportWebVitals'
// IMPORT REACT ROUTER COMPONENTS
import {BrowserRouter} from 'react-router-dom';//Import BrowserRouter from react-router-dom;

const root = ReactDOM.createRoot(document.getElementById('root'));// Create a root for rendering the React app using the element id

// =================JSX RENDERING========================================
root.render(
  <React.StrictMode>{/* Enable additional checks and warnings during development */}
    <BrowserRouter>
    {/* Render the main App.js component */}
       <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
