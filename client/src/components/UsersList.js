import React from 'react'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { TrashIcon, X } from 'lucide-react';
export default function UsersList() {
  return (
    <div id='usersData'>
        <Row id='usersListRow'>
            <Col id='usersListCol1'/>
            <Col id='usersListCol' md={10} xs='12'>
                <div id='usersTableWrapper'>
            <table id='usersTable'>
                <thead>
                    <tr>
                        <th colSpan={5}>USERS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>USERNAME</th>
                        <th>FULL NAME</th>
                        <th>IS ADMIN</th>
                        <th>{/* BUTTONS */}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#{/*index*/}</td>
                        <td>username</td>
                        <td>Firstname lastname</td>
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
                        <td>ADMIN USERS CANNOT BE VIEWED OR REMOVED</td>
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
      <div className="p-2">
      <h4 className='panalHeading'>{/* # */}username     </h4>
        
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2"><Button variant='warning' id='closePanalBtn'><X/>CLOSE</Button></div>
    </Stack>
    <div id='userPanalBody'>
         <Stack gap={3}>
         {/* username */}
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>USERNAME:</p>
        </span>
      </div>
      {/* Contact details */}
      <div className="p-2">
        <label className='userDataLabel'>CONTACT DETAILS:</label>
      </div>
    </Stack>
     <Stack gap={3}>
     {/* FullName */}
      <div className="p-2">First item</div>
      {/* Date ofBirth */}
      <div className="p-2">Second item</div>
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
        // onClick={}
        type='button'
        // ARIA ATTRIBUTE:
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
