//Login.js
import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css'
import MainHeader from '../components/MainHeader'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import LoginForm from '../components/LoginForm';

//============MAIN LOGIN COMPONENT===========
export default function Login(
    {//PROPS PASSED FROM PARENT COMPONENT (App.js)
        userData, 
        setUserData,
        setError,
        setLoggedIn,
        setCurrentUser
    }) {
        //=============STATE VARIABLES=============
        const [loading, setLoading] = useState(false);// State Used to disable the button and show loading text.
        const navigate = useNavigate();

    //================REQUESTS/CALLBACKS====================
        const submitLogin = useCallback(async () => {
            if (loading) return // Ignore repeat submits while a request is in flight
            try {
                setLoading(true)
                setError(null)
                const response = await fetch(`/auth/login`,{
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: userData.username,
                        password: userData.password
                    })
                })

                 const data = await response.json().catch(() => ({}));
                 if (response.ok) {
                    // 'admin' matches the field name Header and ProtectedAdminRoute check
                    const user = { userId: data.userId, fullName: data.fullName, admin: data.isAdmin === true };
                    localStorage.setItem('username', userData.username)
                    localStorage.setItem('loggedIn', 'true')
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('currentUser', JSON.stringify(user))
                    setCurrentUser(user);
                    setLoggedIn(true)
                    setUserData((prev) => ({ ...prev, password: '' }))// Don't keep the password in state after login
                    setError(null)
                    navigate('/')// Redirect to the Home page
                 } else {
                    setError(data.message || 'Login failed. Please try again')
                 }
            } catch (error) {
                setError('An error occurred during login. Please try again.');
                console.error('Login error:', error);
                setLoggedIn(false)
            }finally{
                setLoading(false)
            }
        },[loading, setCurrentUser, userData, setUserData, setError, setLoggedIn, navigate])
        //===========JSX RENDERING===========
  return (
    <div id='pageContainer'>
        <MainHeader mainHeading={'LOGIN'}/>
        <section id='loginSection'>
        <div id='loginPanal' role='region'>
            <Row id='loginRow'>
        <Col id='loginCol1'/>
        <Col xs={6} id='loginCol'>
            <div id='loginDiv'>
                <LoginForm
                    userData={userData}
                    submitLogin={submitLogin}
                    setUserData={setUserData}
                    loading={loading}
                />
            </div>
        </Col>
        <Col id='loginCol2'/>
      </Row>
        </div>
        </section>
    </div>
  )
}
