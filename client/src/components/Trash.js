//Trash.js
import React, { useCallback } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Trash.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Header from '../components/Header'
import Footer from '../components/Footer'
import { ArchiveRestore, TrashIcon } from 'lucide-react';


//====MAIN TRASH FUNCTION COMPONENT========
export default function Trash(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout, 
    setError
  }) {

      const restore = useCallback(async () => {
        try {
           const token = localStorage.getItem('token')
          if(!token) return
          const response = await fetch('http://localhost:3001/notes/:id/restore',{
            method: 'PATCH',
            mode:'cors',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          const data = await response.json()
        } catch (error) {
          setError()
        }
      },[setError])
      
      const deleteNote = useCallback(async () => {
        try {
          const token = localStorage.getItem('token')
          if(!token) return
          const response = await fetch('http://localhost:3001/notes/:id/permanent',{
            method: 'DELETE',
            mode: 'cors',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

        } catch (error) {
          // setError()
        }
      },[])

      const handleDelete = () => {
          const confirmDelete = window.confirm(
            `Are you sure you want to permenantly delete the note? 
            This is irreversable`
        )
        if (!confirmDelete) return;
        deleteNote()
      }
      //================JSX RENDERING==================
  return (
    <div id='pageContainer'>
    <Header heading={'TRASH'} currentUser={currentUser} />
    <section id='trashSection'>
    <Row id='trashRow'>
        <Col id='trashCol'>
          <div id='trashTableWrapper'>
            <table id='trashTable'>
              <thead>
                <tr>
                  <th colSpan={7}>TRASH</th>
                </tr>
                <tr>
                  <th>#</th>
                  <th>TITLE</th>
                  <th>LANGUAGE</th>
                  <th>TAGS</th>
                  <th>NOTE BOOK</th>
                  <th>DATE ADDED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>#</td>
                  <td>TITLE</td>
                  <td>Language</td>
                  <td>Tags</td>
                  <td>Note book</td>
                  <td>date added</td>
                  <td>
                  <div id='trashTableBtns'>
                  <Button
                  variant='light'
                  id='restoreNoteBtn'
                  onClick={restore}
                  >
                    RESTORE <ArchiveRestore/>
                  </Button>
                       <Button
                    id='permanentDeleteBtn'
                    variant='danger'
                    type='button'
                    onClick={handleDelete}
                    >DELETE
                      <TrashIcon/>
                    </Button>

                  </div>
                 
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>RESTORE TO VIEW NOTE DETAILS</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Col>
      </Row>

    </section>
    <Footer logout={logout}/>
    </div>
  )
}
