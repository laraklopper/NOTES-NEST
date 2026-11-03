import React from 'react'
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';


export default function EditProfile(
  // {setError}
) {
  
  return (
    <form>
      <div id='formHeadingBlock'>
        <div>
          <h3>EDIT PROFILE</h3>
        </div>
      </div>
      <div>
        <fieldset id='editProfileGroup1'>
          {/* <legend>USERNAME AND FULLNAME</legend> */}
          <Stack gap={3}>
      <div className="p-2">First item</div>
      <div className="p-2">Second item</div>
      <div className="p-2">Third item</div>
    </Stack>

        </fieldset>
      </div>
    </form>
  )
}
