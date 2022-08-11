/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import logo from './../../assets/stoat.png';
import { Form, Button, OverlayTrigger, Tooltip} from 'react-bootstrap';
import SwitchButton from 'bootstrap-switch-button-react';

/*
  Login Portal using OrientDB OUser System class for users
  Tracks user state, if !logged in don't show any other components
*/
class LoginPortal extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      databases: [],
      currentDb: '',
      useExisting: true
    }
  }

  validateForm() {
    return this.props.uname.length > 0 && this.props.passwd.length > 0;
  }

  componentDidMount() {
    // Get a list of valid databases
    let url = process.env.REACT_APP_DB + '/databases'
    fetch(url, {
      method: 'GET'
    }).then(response => response.json())
    .then(response => {
      this.setState({
        databases: response.databases,
        currentDb: response.currentDb,
        useExisting: response.databases.length > 0
      })
    })
  }

  toggleUseExisting = () => {
    this.setState({
      useExisting: !this.state.useExisting
    })
  }

  render() {

    const dbList = this.state.databases.map((db, dbIndex) => {
      return(<option key={dbIndex} value={db}>{db}</option>);
    });

    let databaseForm = ''

    if (this.state.useExisting === true) {
      databaseForm = (<Form.Control as="select" defaultValue='' onChange={this.props.handleChange} required>
                          <option value='' disabled hidden>Select Database</option>
                          {dbList}
                        </Form.Control>)
    } else {
      databaseForm = (<Form.Control value={this.props.database} placeholder='New Database Name...' onChange={this.props.handleChange} type='text'/>)
    }

    return (
      <div className='Login'>
        <img src={logo} alt='STOAT logo'/>
        <Form onSubmit={this.props.handleSubmit}>
          <Form.Group controlId='database'>
          <Form.Label>Database</Form.Label>
            <OverlayTrigger 
              placement='right' 
              delay={{ show: 250, hide: 400 }}
              overlay={
                <Tooltip id="button-tooltip">
                  STOAT uses OrientDB to store scoring data. You can choose either an existing database, or create a new one.
                </Tooltip>
              }>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
              </svg>
            </OverlayTrigger>
            
            <div className='mx-3'/>
            <SwitchButton 
              width={150} 
              checked={this.state.useExisting} 
              onlabel='Use Existing' 
              offlabel='Create New' 
              onstyle='primary'
              offstyle='dark'
              onChange={(checked) => this.setState({useExisting: checked})}
            />
            
            <div className='m-3'/>

            {databaseForm}
            
          </Form.Group>
          <Form.Group controlId='username' >
            <Form.Label>Database Username</Form.Label>
            <OverlayTrigger 
              placement='right' 
              delay={{ show: 250, hide: 400 }}
              overlay={
                <Tooltip id="button-tooltip">
                  This should be your OrientDB server root username and password.
                </Tooltip>
              }>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
              </svg>
            </OverlayTrigger>
            <Form.Control
              autoFocus={true}
              type='text'
              value={this.props.uname}
              onChange={this.props.handleChange}
            />
          </Form.Group>
          <Form.Group controlId='password' >
            <Form.Label>Database Password</Form.Label>
            <Form.Control
              value={this.props.passwd}
              onChange={this.props.handleChange}
              type='password'
            />
          </Form.Group>
          <span className='form-error-msg'>{this.props.errorMsg}</span>
          <Button
            block={true}
            
            disabled={!this.validateForm()}
            type='submit'
          >
            Login
          </Button>

        </Form>
      </div>
    );
  }
}

export default LoginPortal;
