//Login.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
//IMPORT CUSTOM COMPONENTS
import MainHeader from '../components/MainHeader'
import LoginForm from '../components/LoginForm';
//IMPORT REACT-ROUTER-DOM COMPENTS
import { useNavigate } from 'react-router-dom'
// IMPORT ICONS FROM LUCIDE-REACT
import { UserKey } from 'lucide-react'

//============MAIN LOGIN COMPONENT===========
export default function Login(//Export the default Login function component
    {//PROPS PASSED FROM PARENT COMPONENT (App.js)
        userData, 
        setUserData,
        setError,
        setLoggedIn,
        setCurrentUser
    }) {
        //=============STATE VARIABLES=============
        const [loading, setLoading] = useState(false);// State Used to disable the button and show loading text.
        
            //=======NAViGATE=======
  // Hook to navigate between different routes
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
                    // The JWT is in an HTTP-only cookie set by the server, so only the user details are saved here
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
    <div id='pageContainer' role='main'>
        <MainHeader mainHeading={'LOGIN'}/>
        <Row id='eventRow' role='presentation'>
            <Col id='eventCol'>
                <div className='eventBar'>
                    <div className='eventTrack'>
                        <UserKey className='eventSlide' color='#000' size={32} aria-hidden='true' focusable='false'/>
                    </div>
                </div>
            </Col>
        </Row>
        {/* -------------------------
        SECTION 1: LoginForm
        ------------------ */}
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
