//ProtectedUserRoute.js
import React from 'react'
import { Navigate } from 'react-router-dom'

//ProtectedUserRoute Function Component
export default function ProtectedUserRoute(//Export default ProtectedUserRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        children, 
        currentUser
    }
) {
     // If no user is logged in,
  // redirect to the login(landing) page.
    if (!currentUser) {
        return <Navigate to={'/'}/>
    }
        // If a user is logged in,
  // render the protected content.
    return children
}
