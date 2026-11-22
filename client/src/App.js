// App.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState, useEffect, useCallback } from 'react'
// IMPORT CSS STYLESHEETS
import './App.css'
import './css/pagesCss/Animations.css'
// IMPORT BOOTSTRAP COMPONENTS
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// IMPORT REACT ROUTER COMPONENTS
import { Routes , Route, Navigate, useNavigate} from 'react-router-dom';
// IMPORT CUSTOM COMPONENTS
// PROTECTED ROUTES
import ProtectedUserRoute from './protectedRoutes/ProtectedUserRoute';
// import ProtectedAdminRoute from './protectedRoutes/ProtectedAdminRoute';
// IMPORT MAIN PAGES CUSTOM COMPONENTS
// PUBLIC PAGES
import Login from './pages/Login';
import Register from './pages/Register';
// PROTECTED PAGES
import Home from './pages/Home';
import NotePad from './pages/NotePad';
import Notes from './pages/Notes';
import Translate from './pages/Translate';
// RESPONSIVE STYLESHEET: imported after the pages so its media queries load last
import './css/pagesCss/Responsive.css'
// IMPORT ICONS FROM LUCIDE-REACT
import { Bug } from 'lucide-react';

// MAIN APP FUNCTION COMPONENT
export default function App() {//Export defualt App.js function component
   // ========STATE VARIABLES================
   //User variables
  const [users, setUsers] = useState([])// List of all users (only filled in for admins)
  const [currentUser, setCurrentUser] = useState(null)// Logged-in user: { userId, fullName, admin }
  // Form data for the Login page, shaped like the server's user model
  const [userData, setUserData] = useState({
    username: '',
    fullName: {
      firstName: '',
      lastName: ''
    },
    contactDetails: {
      email: '',
      phoneNumber: '',
    },
    defaultSourceLang: '',
    defaultTargetLang: '',
    dateOfBirth: '',
    password: '',
    admin: false
  })
  // Event and UI-related states
  const [loggedIn, setLoggedIn] = useState(false)// Decides which set of routes is rendered
  const [error, setError] = useState(null)// Message shown in the global error banner (null hides it)

    //=======NAViGATE=======
  // Hook to navigate between different routes
  const navigate = useNavigate();

  // ==============================
  // Forget the saved user and return to the logged-out state
  const clearSession = useCallback(() => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setLoggedIn(false);
    setUsers([]);
  }, []);

  /* Restore the session saved by Login.js so a page refresh doesn't log the user out.
  The JWT is in an HTTP-only cookie the client can't read, so GET /user/me checks it is still valid */
  useEffect(() => {
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem('currentUser'));
    } catch (error) {
      console.error('Error reading saved user:', error);
    }
    if (!savedUser) return// Nothing saved, so stay logged out

    setCurrentUser(savedUser);// Show the logged-in pages straight away while the cookie is checked
    setLoggedIn(true);

    const verifySession = async () => {
      try {
        const response = await fetch('/user/me', { method: 'GET' });
        if (!response.ok) {
          throw new Error('Session expired');
        }
        const user = await response.json();
        // Keep only the fields the client needs
        const freshUser = { userId: user._id, fullName: user.fullName, admin: user.admin === true };
        localStorage.setItem('currentUser', JSON.stringify(freshUser));
        setCurrentUser(freshUser);// Pick up changes made since login, e.g. admin status
      } catch (error) {
        console.error('Error restoring session:', error);
        clearSession();// Cookie is missing or expired, so log out locally
      }
    }
    verifySession();
  }, [clearSession]);

  // Only admins can see the users list
  // Runs again whenever currentUser changes, e.g. after login or session restore
  useEffect(() => {
    if (!currentUser?.admin) return
    const fetchUsers = async () => {
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch('/user/fetchUsers', { method: 'GET' });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        // Make sure the server sent a list before storing it
         if (Array.isArray(data)) {
          setUsers(data);
          setError(null);// Clear any earlier error
        } else {
          throw new Error('Unexpected users response format');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users');
      }
    }
    fetchUsers();
  }, [currentUser]);


  // ==============LOGOUT================
  // Log out on the server, clear local state and go back to the login page
  const logout = useCallback(async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });// Server clears the JWT cookie
    } catch (error) {
      console.error('Error logging out:', error);// Still log out locally
    }
    clearSession();
    navigate('/');// The login page lives at '/' when logged out
  }, [clearSession, navigate]);

  // =================JSX RENDERING========================================
  return (
    <>
    <Container id='appContainer' role='main' fluid>
      {/* ------GLOBAL ERROR BANNER: any page can set it via setError */}
         <Row id='globalErrorRow'>
         {/* Empty side columns centre the banner on medium+ screens */}
         <Col xs={0} md id='errorCol1'/>
        <Col xs={12} md={8} id='globalErrorCol'>
          <div id='globalErrorBlock'>
            {/* Only shown when there is an error message */}
            {error &&
              <span>
              <Bug size={20} fontWeight={900} color='#3D0F13' aria-hidden='true'/>
                <p id='errorMessage'>{error}</p>  
              </span>
            }
          </div>
        </Col>
        <Col xs={0} md id='errorCol2'/>
      </Row>
      {/* ------MAIN APPLICATION CONTAINER */}
      <Container id='routesContainer'>
      {/* --------------
      CLIENT SIDE ROUTES
      ---------------------- */}
        <Routes>
          {/* Logged-in users get the protected pages, everyone else gets Login/Register */}
          {loggedIn ? (
            <>
            {/* =====PROTECTED ROUTES (logged in)===== */}
            {/* Protected Route to Home page */}
              <Route path='/' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <Home 
                    currentUser={currentUser} 
                    setError={setError} 
                    setCurrentUser={setCurrentUser} 
                    logout={logout}
                    users={users}
                      loggedIn={loggedIn}
                    />
                </ProtectedUserRoute>
              }/>
              {/*Protected Route to NotePad page */}
              <Route path='/notepad' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <NotePad 
                    currentUser={currentUser} 
                    logout={logout} 
                    setError={setError}
                      loggedIn={loggedIn}
                    />
                </ProtectedUserRoute>
              }/>
              {/* Protected Route to Notes page */}
              <Route path='/notes' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <Notes currentUser={currentUser} loggedIn={loggedIn} logout={logout} setError={setError}/>
                </ProtectedUserRoute>
              }/>
              {/* Protected Route to Translate page */}
              <Route path='/translate' element={
                <ProtectedUserRoute currentUser={currentUser}>
                <Translate currentUser={currentUser} logout={logout} loggedIn={loggedIn}/>
                </ProtectedUserRoute>
              }/> 
              
               {/* FALL BACK ROUTE: Response 404 PAGE NOT FOUND */}
            {/* <Route path='*' element={<h2 id='pageNotFound'>404: Page Not Found</h2>}/> */}
              <Route path='*' element={<Navigate to='/' replace/>}/>
            </>
          ):(
            <>
            {/* =====PUBLIC ROUTES (logged out)===== */}
              {/* Route to Login Page */}
              <Route path='/' element={<Login
                userData={userData}
                setUserData={setUserData}
                setError={setError}
                setLoggedIn={setLoggedIn}
                setCurrentUser={setCurrentUser}
                loggedIn={loggedIn}
              />}/>
              {/* Route to Registration page */}
              <Route path='/reg' element={<Register loggedIn={loggedIn} setError={setError}/>}/>
               {/* FALL BACK ROUTE: Response 404 PAGE NOT FOUND */}
              {/* <Route path='*' element={<h2 id='pageNotFound'>404: Page Not Found</h2>}/> */}
              <Route path='*' element={<Navigate to='/' replace/>}/>
            </>
          )}
        </Routes>
      </Container>
      </Container>
    </>
  )
}
