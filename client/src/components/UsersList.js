//UsersList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
import '../css/componentCss/ListBtns.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { dateDisplay, formatTimestamp } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { TrashIcon, X } from 'lucide-react';
// IMPORT COMPONENTS
import Pagination, { PAGE_SIZES } from './Pagination';

// "Firstname Lastname" from the nested fullName object
const fullNameOf = (user) => `${user?.fullName?.firstName || ''} ${user?.fullName?.lastName || ''}`.trim() || '-'

// UsersList component
/* Admin-only table of every account, with a details panal for the selected (non-admin) user.
GET /user/fetchUsers, GET /user/fetchUser/:id, DELETE /user/deleteUser/:id */
export default function UsersList() {
    const [users, setUsers] = useState([])
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [loading, setLoading] = useState(false)// True while the users list is loading
    const [panalLoading, setPanalLoading] = useState(false)// True while a single user is loading
    const [actionLoading, setActionLoading] = useState(false)// True while a delete request is running
    const [error, setError] = useState(null)
    const [selectedUser, setSelectedUser] = useState(null)// User shown in the panal (from GET /user/fetchUser/:id)

    // The server returns every user, so the table is paged here
    const totalPages = Math.max(Math.ceil(users.length / limit), 1)
    const currentPage = Math.min(page, totalPages)// A delete can empty the last page
    const pageUsers = users.slice((currentPage - 1) * limit, currentPage * limit)
    const rowNumber = (index) => (currentPage - 1) * limit + index + 1// Numbering carries on across pages

    //========FETCH USERS REQUEST===============
    const fetchUsers = useCallback(async () => {
        setError(null)
        setLoading(true)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch('/user/fetchUsers', { method: 'GET' })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to load users')
            if (!Array.isArray(data)) throw new Error('Unexpected users response format')

            setUsers(data)
            console.log(`[SUCCESS: UsersList.js] Fetched ${data.length} users`)
        } catch (error) {
            console.error('[ERROR: UsersList.js] Fetching users failed:', error.message)
            setError(error.message || 'Something went wrong while loading users.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    //========FETCH SINGLE USER REQUEST===============
    const viewUser = useCallback(async (id) => {
        setError(null)
        setPanalLoading(true)
        try {
            const response = await fetch(`/user/fetchUser/${id}`, { method: 'GET' })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to load user')

            setSelectedUser(data)
        } catch (error) {
            console.error('[ERROR: UsersList.js] Fetching user failed:', error.message)
            setError(error.message || 'Something went wrong while loading this user.')
            setSelectedUser(null)
        } finally {
            setPanalLoading(false)
        }
    }, [])

    //========DELETE USER REQUEST===============
    const deleteUser = useCallback(async (user) => {
        setError(null)
        setActionLoading(true)
        try {
            const response = await fetch(`/user/deleteUser/${user._id}`, { method: 'DELETE' })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to remove user')

            setSelectedUser(null)// Close the panal
            await fetchUsers()// Refresh the list so the user disappears from it
            alert(`User @${user.username} successfully removed`)
        } catch (error) {
            console.error('[ERROR: UsersList.js] Removing user failed:', error.message)
            setError(error.message || 'Something went wrong while removing this user. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }, [fetchUsers])

    // Ask before removing the selected user
    const handleDelete = () => {
        if (!selectedUser) return
        const confirmDelete = window.confirm(
            `Are you sure you want to permanently remove @${selectedUser.username}? All of their notes, notebooks, tags and translations will be deleted too.`
        )
        if (!confirmDelete) return
        deleteUser(selectedUser)
    }

    //=======================JSX RENDERING=======================================
  return (
    <div id='usersData'>
        {error && <p className='text-danger' role='alert'>{error}</p>}
        <Row id='usersListRow'>
          
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
                    {loading && users.length === 0 ? (
                        <tr>
                            <td colSpan={6}>LOADING USERS...</td>
                        </tr>
                    ) : users.length === 0 ? (
                        <tr>
                            <td colSpan={6}>NO USERS FOUND</td>
                        </tr>
                    ) : (
                        pageUsers.map((user, index) => (
                            <tr key={user._id}>
                                <td style={{width:'40px'}}>{rowNumber(index)}</td>
                                <td>@{user.username}</td>
                                <td>{fullNameOf(user)}</td>
                                <td>{user.contactDetails?.email || '-'}</td>
                                <td>{user.admin ? 'YES' : 'NO'}</td>
                                <td>
                                    <div id='usersListBtns'>
                                        <Button
                                        variant='light'
                                        id='viewItemBtn'
                                        type='button'
                                        onClick={() => viewUser(user._id)}
                                        disabled={user.admin === true || panalLoading}// Admin accounts cannot be viewed
                                        // ARIA ATTRIBUTES:
                                        aria-label={user.admin ? `${user.username} is an admin and cannot be viewed` : `View user ${user.username}`}
                                        aria-pressed={selectedUser?._id === user._id}
                                        >
                                            VIEW
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={6}>ADMIN USERS CANNOT BE VIEWED OR REMOVED</td>
                    </tr>
                    <tr>
                        <td colSpan={6}>
                        {/* PAGINATION (Pagination.js) */}
                        <Pagination
                            page={currentPage}
                            totalPages={totalPages}
                            total={users.length}
                            limit={limit}
                            setPage={setPage}
                            setLimit={setLimit}
                            loading={loading}
                            controlId='usersPageSize'
                        />
                        </td>
                    </tr>
                </tfoot>
            </table>
                </div>
            </Col>
         
        </Row>
        {/* SELECTED USER PANAL */}
        {panalLoading && !selectedUser && <p role='status'>LOADING USER...</p>}
        {selectedUser && (
      <Row id='usersPanalRow'>
            <Col id='usersPanalCol'>
                 <div id='userPanal'>
            <Stack direction="horizontal" gap={3} id='panalHeader'>
      <div className="p-2" id='panalHeadingBlock'>
      <h4 className='panalHeading'>@{selectedUser.username}</h4>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='warning'
        id='closePanalBtn'
        type='button'
        onClick={() => setSelectedUser(null)}
        // ARIA ATTRIBUTES:
        aria-label='Close user details'
        >
            <X aria-hidden='true' focusable='false'/>CLOSE
        </Button>
      </div>
    </Stack>
    <div id='userPanalBody'>
         <Stack gap={3} id='userBodyStack1'>
         {/* username */}
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>USERNAME:</p>
            <p className='dataValue'>@{selectedUser.username}</p>
        </span>
      </div>
      {/* Contact details */}
      <div className="p-2">
        <label className='userDataLabel'>CONTACT DETAILS:</label>
        <span className='dataSpan'>
            <p className='dataLabel'>EMAIL:</p>
            <p className='dataValue'>{selectedUser.contactDetails?.email || '-'}</p>
        </span>
        <span className='dataSpan'>
            <p className='dataLabel'>CONTACT NUMBER:</p>
            <p className='dataValue'>{selectedUser.contactDetails?.contactNumber || '-'}</p>
        </span>
      </div>
    </Stack>
     <Stack gap={3} id='userBodyStack2'>
     {/* FullName */}
      <div className="p-2">
        <label className='userDataLabel'>FULL NAME:</label>
        <span className='dataSpan'>
            <p className='dataLabel'>FIRST NAME:</p>
            <p className='dataValue'>{selectedUser.fullName?.firstName || '-'}</p>
        </span>
        <span className='dataSpan'>
            <p className='dataLabel'>LAST NAME:</p>
            <p className='dataValue'>{selectedUser.fullName?.lastName || '-'}</p>
        </span>
      </div>
      {/* Date ofBirth */}
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE OF BIRTH:</p>
            <p className='dataValue'>{dateDisplay(selectedUser.dateOfBirth)}</p>
        </span>
      </div>
    </Stack>
    </div>
    <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>{formatTimestamp(selectedUser.createdAt)}</p>
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
        disabled={actionLoading}
        // ARIA ATTRIBUTES:
        aria-label={`Remove user ${selectedUser.username}`}
        >
            <TrashIcon aria-hidden='true' focusable='false'/>{actionLoading ? 'REMOVING...' : 'REMOVE USER'}
        </Button>
      </div>
    </Stack>
        </div>
            </Col>
        </Row>
        )}
    </div>
  )
}
