import React from 'react'
import Header from '../components/Header'

export default function Dashboard(
    {currentUser}
) {
  return (
    <div>
        <Header currentUser={currentUser}/>
    </div>
  )
}
