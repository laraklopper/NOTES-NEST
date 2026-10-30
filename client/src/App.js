import React, { useState } from 'react'
import './App.css'
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Bug} from 'lucide-react';
import { Routes , Route} from 'react-router-dom';
import ProtectedUserRoute from './protectedRoutes/ProtectedUserRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import NotePad from './pages/NotePad';


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
    dateOfBirth: '',
    password: '',
    admin: false

  })
  const [loggedIn, setLoggedIn] = useState(false)
  const [error, setError] = useState(null)
  return (
    <>
    <Container>
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
                  <Dashboard currentUser={currentUser}/>
                </ProtectedUserRoute>
              }/>
              <Route path='/notepad' element={
                <ProtectedUserRoute currentUser={currentUser}>
                  <NotePad/>
                </ProtectedUserRoute>
              }/>
            </>
          ):(
            <>
              <Route path='/' element={<Login
                userData={userData}
              />}/>
              <Route path='/reg' element={<Register/>}/>
            </>
          )}
        </Routes>
      </Container>
      </Container>
    </>
  )
}
