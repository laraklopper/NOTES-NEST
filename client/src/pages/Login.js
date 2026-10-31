import React, { useCallback, useState } from 'react'
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css'
import MainHeader from '../components/MainHeader'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import LoginForm from '../components/LoginForm';
export default function Login(
    {//PROPS PASSED FROM PARENT COMPONENT (App.js)
        userData, 
        setUserData,
        setError,
        loggedIn,
        setLoggedIn,
        setCurrentUser
    }) {
        const [loading, setLoading] = useState(false)

    
        const submitLogin = useCallback(async () => {
            try {
                setError(null)
                const response = await fetch(`http://localStorage:3001/auth/login`,{
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
                    localStorage.setItem('username', userData.username)
                    localStorage.setItem('loggedIn', true)
                    localStorage.setItem('token', data.token)
                    setCurrentUser({ userId: data.userId, fullName: data.fullName, isAdmin: data.isAdmin });
                    setError(null)
                 } else {
                    setError(data.message || 'Login failed. Please try again')
                 }
                 setLoading('false')
            } catch (error) {
                setError('An error occurred during login. Please try again.');
                console.error('Login error:', error);
                setLoggedIn('false')
            }finally{
                setLoading(false)
            }
        },[setCurrentUser, setLoading, userData, setError, setLoggedIn])
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
