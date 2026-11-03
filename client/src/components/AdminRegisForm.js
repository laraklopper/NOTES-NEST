import React, { useCallback, useState } from 'react'
import '../css/componentCss/RegistrationForm.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

export default function AdminRegisForm(
    {
        setCurrentUser,
        exitAdminForm,
        setError
    }) {
    //=====STATE VARIABLES==========
    const [adminStatus, setAdminStatus] = useState('')
    const [submitting, SetSubmitting] = useState('false')


    const setAdmin = useCallback(async () => {
       try {
        const token = localStorage.getItem('token')

        if(!token) return;
       } catch (error) {
        
       } 
    },[])
    //=====================
  return (
    <div>AdminRegisForm</div>
  )
}
