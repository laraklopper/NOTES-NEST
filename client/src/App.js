import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Bug} from 'lucide-react';
import { Routes , Route, Navigate, useNavigate} from 'react-router-dom';
import ProtectedUserRoute from './protectedRoutes/ProtectedUserRoute';
import ProtectedAdminRoute from './protectedRoutes/ProtectedAdminRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotePad from './pages/NotePad';
import Notes from './pages/Notes';
import Translate from './pages/Translate';
import Trash from './pages/Trash';
import Users from './pages/Users';

export default function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
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
  const [loggedIn, setLoggedIn] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate();

  // Restore the session saved by Login.js so a page refresh doesn't log the user out
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!token || !savedUser) return

      // Drop the session if the JWT has expired
      const { exp } = JSON.parse(atob(token.split('.')[1]));
      if (exp && exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }
      setCurrentUser(savedUser);
      setLoggedIn(true);
    } catch (error) {
      console.error('Error restoring session:', error);
      localStorage.removeItem('username');
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setLoggedIn(false);
    }
  }, []);

  // Only admins can see the users list
  useEffect(() => {
    if (!currentUser?.admin) return
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return

        const response = await fetch('/fetchUsers', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
         if (Array.isArray(data)) {
          setUsers(data);
          setError(null);
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



  const logout = useCallback(() => {
    localStorage.removeItem('username');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setLoggedIn(false);
    setUsers([]);
    navigate('/');// The login page lives at '/' when logged out
  }, [navigate]);
  return (
    <>
    <Container id='appContainer' role='main'>
         <Row id='globalErrorRow'>
         <Col xs={0} md id='errorCol1'/>
        <Col xs={12} md={8} id='globalErrorCol'>
          <div id='globalErrorBlock'>
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
      <Container id='appContainer'>
        <Routes>
          {loggedIn ? (
            <>
              <Route path='/' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <Home currentUser={currentUser} logout={logout}/>
                </ProtectedUserRoute>
           
              }/>
              <Route path='/notepad' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <NotePad currentUser={currentUser} logout={logout}/>
                </ProtectedUserRoute>
              }/>
              <Route path='/notes' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <Notes currentUser={currentUser} logout={logout}/>
                </ProtectedUserRoute>
              }/>
              <Route path='/translate' element={
                <ProtectedUserRoute currentUser={currentUser}>
                <Translate currentUser={currentUser} logout={logout}/>
                </ProtectedUserRoute>
              }/> 
              <Route path='/trash' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <Trash currentUser={currentUser} logout={logout}/>
                </ProtectedUserRoute>
              }/>
              <Route path='/users' element={
                <ProtectedAdminRoute currentUser={currentUser}>
                  <Users currentUser={currentUser} users={users} logout={logout}/>
                </ProtectedAdminRoute>
              }/>
              <Route path='*' element={<Navigate to='/' replace/>}/>
            </>
          ):(
            <>
              
              <Route path='/' element={<Login
                userData={userData}
                setUserData={setUserData}
                setError={setError}
                setLoggedIn={setLoggedIn}
                setCurrentUser={setCurrentUser}
              />}/>
              <Route path='/reg' element={<Register setError={setError}/>}/>
              <Route path='*' element={<Navigate to='/' replace/>}/>
            </>
          )}
        </Routes>
      </Container>
      </Container>
    </>
  )
}
