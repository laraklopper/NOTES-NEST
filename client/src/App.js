import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Bug} from 'lucide-react';
import { Routes , Route, useNavigate} from 'react-router-dom';
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

 useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');

       if (!token) return

       const response = await fetch('http://localhost:3000/users/me', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch current user');
        }
        const me = await response.json();
        setCurrentUser(me);
        setLoggedIn(true);
      } catch (error) {
        console.error('Error fetching current user:', error);
        setCurrentUser(null);
        setLoggedIn(false);
      }
    }
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return

        const response = await fetch('http://localhost:3000/fetchUsers', {
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
        setUsers(users);
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
    fetchCurrentUser();
    fetchUsers();
      
  },[setCurrentUser, setLoggedIn, setError, setUsers, users]);



  const logout = useCallback(() => {
    localStorage.removeItem('username');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setLoggedIn(false);
    navigate('/login');
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
                  <Notes/>
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
                  <Users currentUser={currentUser} logout={logout}/>
                </ProtectedAdminRoute>
              }/>
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
            </>
          )}
        </Routes>
      </Container>
      </Container>
    </>
  )
}
