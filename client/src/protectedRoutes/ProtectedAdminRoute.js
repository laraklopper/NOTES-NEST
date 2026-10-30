
//ProtectedAdminRoute.js
import React from 'react'
import { Navigate } from 'react-router-dom'

//ProtectedAdminRoute Function Component
export default function ProtectedAdminRoute(//Export default ProtectedAdminRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        currentUser,
        children
    }
) {
    /* If there is no logged-in user OR the user is not an admin,
  redirect to the login(landing) page.*/
  if (!currentUser || !currentUser.admin) {
    return <Navigate to='/'/>
  }
  /*If the user is loggedIn and Admin render the protected routes */
  return children
}
