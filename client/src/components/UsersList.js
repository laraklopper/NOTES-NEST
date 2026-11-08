import React, { useCallback, useState } from 'react'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { TrashIcon, X } from 'lucide-react';
export default function UsersList({setError}) {
    const [selectedUserId, setSelectedUserId] = useState(null)
    const [loading, setLoading] = useState(false)//Loading state to loadUsers

    const deleteUser = useCallback (async () => {
       try {
        const token = localStorage.getItem('token')
        if (!token) return;
        const response = await fetch (`http://localhost:3001/users/deleteUser/:id`,{
            method: 'DELETE',
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
       } catch (error) {
        setError()
       } 
    },[setError])

    const handleDelete = () => {
        if(!selectedUserId) return
        const confirmDelete = window.confirm('Are you sure you want to permanently remove this user?')
        if(!confirmDelete) return;
        deleteUser()
    }
  return (
    <div id='usersData'>
        <Row id='usersListRow'>
            <Col id='usersListCol1'/>
            <Col id='usersListCol' md={8} xs='12'>
                <div id='usersTableWrapper'>
            <table id='usersTable'>
                <thead>
                    <tr>
                        <th colSpan={6}>USERS</th>
                    </tr>
                    <tr>
                        <th style={{width:'40px'}}>#</th>
                        <th>USERNAME</th>
                        <th>FULL NAME</th>
                        <th>EMAIL</th>
                        <th>IS ADMIN</th>
                        <th>{/* BUTTONS */}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{width:'40px'}}>#{/*index*/}</td>
                        <td>username</td>
                        <td>Firstname lastname</td>
                        <td>email</td>
                        <td>YES/NO</td>
                        <td>
                            <div id='usersListBtns'>
                                <Button
                                variant='light'
                                id='viewItemBtn'
                                type='button'
                                // onClick={}
                                >
                                    VIEW
                                </Button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={6}>ADMIN USERS CANNOT BE VIEWED OR REMOVED</td>
                    </tr>
                    <tr>
                        <td colSpan={6}>
                              <div id='paginationDiv'>
                                PAGINATION
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
                </div>
            </Col>
            <Col/>
        </Row>
        {/* selectedUserPanal */}
      <Row id='usersPanalRow'>
            <Col id='usersPanalCol'>
                 <div id='userPanal'>
            <Stack direction="horizontal" gap={3} id='panalHeader'>
      <div className="p-2" id='panalHeadingBlock'>
      <h4 className='panalHeading'>{/* # */}username</h4>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2"><Button variant='warning' id='closePanalBtn'><X/>CLOSE</Button></div>
    </Stack>
    <div id='userPanalBody'>
         <Stack gap={3} id='userBodyStack1'>
         {/* username */}
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>USERNAME:</p>
            <p className='dataLabel'></p>
        </span>
      </div>
      {/* Contact details */}
      <div className="p-2">
        <label className='userDataLabel'>CONTACT DETAILS:</label>
        <span className='dataSpan'>
            <p className='dataLabel'>EMAIL:</p>
            <p className='dataValue'>email</p>
        </span>
        <span className='dataSpan'>
            <p className='dataLabel'>CONTACT NUMBER:</p>
            <p className='dataValue'>contact number</p>
        </span>
      </div>
    </Stack>
     <Stack gap={3} id='userBodyStack2'>
     {/* FullName */}
      <div className="p-2">
        <label className='userDataLabel'>FULL NAME:</label>
        <span className='dataSpan'>
            <p className='dataLabel'>FIRST NAME:</p>
            <p className='dataValue'>firstName</p>
        </span>
        <span className='dataSpan'>
            <p className='dataLabel'>LAST NAME:</p>
            <p className='dataValue'>Last name</p>
        </span>
      </div>
      {/* Date ofBirth */}
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE OF BIRTH:</p>
            <p className='dataValue'>date</p>
        </span>
      </div>
    </Stack>
    </div>
    <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>date</p>
        </span>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='removeUserBtn'
        onClick={handleDelete}
        type='button'
        // ARIA ATTRIBUTES:
        // aria-label=''
        >
            <TrashIcon/>REMOVE USER
        </Button>
      </div>
    </Stack>
        </div>
            </Col>
        </Row>
    </div>
  )
}
