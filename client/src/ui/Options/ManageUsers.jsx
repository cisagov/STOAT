/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import { Table, Modal, Form } from 'react-bootstrap';

/*
  Functionality to manage users (add/edit/delete) and their permissions within the application.
*/
class ManageUsers extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            users: [],
            modalCreateUser: false,
            modalEditUser: false,
            modalDeleteUser: false,
            newUserName: '',
            newUserPassword: '',
            newUserPassword2: '',
            newUserRole: null,
            errorMsg: '',
            activeUser: ''
        };

        this.toggleCreate = this.toggleCreate.bind(this);
        this.toggleEdit = this.toggleEdit.bind(this);
        this.toggleDelete = this.toggleDelete.bind(this);
    }

    componentDidMount() {
        const self = this;
        let url = process.env.REACT_APP_DB + '/users'
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
        .then(
            function(queryResults) {
                self.setState({
                    users: queryResults,
                });
            }
        );
    }

    toggleCreate = (event) => {
        this.setState({
            modalCreateUser: !this.state.modalCreateUser
        });
    }

    toggleEdit = (event) => {
        const self = this;
        if (event.target.innerHTML === 'Edit') {
            let url = process.env.REACT_APP_DB + '/select'
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: event.target.parentNode.parentNode.id
                })
            }).then(response => response.json())
            .then(
                function(qResults) {
                    self.setState({
                        activeUser: qResults,
                        modalEditUser: !self.state.modalEditUser
                    });
                }
            );
        } else {
            this.setState({
                modalEditUser: !this.state.modalEditUser
            });
        }
    }

    toggleDelete = (event) => {
        const self = this;
        if (event.target.innerHTML === 'Delete') {
            let url = process.env.REACT_APP_DB + '/select'
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: event.target.parentNode.parentNode.id
                })
            }).then(response => response.json())
            .then(
                function(qResults) {
                    self.setState({
                        activeUser: qResults,
                        modalDeleteUser: !self.state.modalDeleteUser
                    });
                }
            );
        } else {
            this.setState({
                modalDeleteUser: !this.state.modalDeleteUser
            });
        }
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value,
        });
    }

    handleCreateUser = (event) => {
        const self = this;
        if (this.validateNewUser()) {
            let url = process.env.REACT_APP_DB + '/createUser'
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newUserName: this.state.newUserName,
                    newUserPassword: this.state.newUserPassword,
                    newUserRole: this.state.newUserRole
                })
            }).then(response => response.json())
            .then(
                function(newCreatedUser) {
                    console.log('Created user ' + newCreatedUser.name + ' with user role of: ' + newCreatedUser.role);
                    const updatedUsers = self.state.users;
                    //updatedUsers.push({name: newCreatedUser.name, role: newCreatedUser.role});
                    updatedUsers.push(newCreatedUser);
                    self.setState({
                        modalCreateUser: !self.state.modalCreateUser,
                        users: updatedUsers
                    });
                }
            );
        }
    }

    handleEditUser = (event) => {
        const self = this;
        let url = process.env.REACT_APP_DB + '/update'
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: this.state.activeUser['@rid'],
                data: {
                    role: this.state.newUserRole
                }
            })
        }).then(response => response.json())
        .then(
            function(update) {
                console.log('Updated role of ' + self.state.activeUser.name);
                const activeIndex = self.state.users.findIndex((obj) => {
                    return obj['@rid'].toString() === self.state.activeUser['@rid'].toString();
                });
                let updatedUsersRole = self.state.users;
                updatedUsersRole[activeIndex].role = self.state.newUserRole;
                self.setState({
                    modalEditUser: !self.state.modalEditUser,
                    users: updatedUsersRole
                });
            }
        );
    }

    handleDeleteUser = (event) => {
        const self = this;
        let url = process.env.REACT_APP_DB + '/delete'
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: this.state.activeUser['@rid'].toString()
                })
            }).then(response => response.json())
        .then(
            function(del) {
                console.log('Deleted User: ' + self.state.activeUser.name);
                const activeIndex = self.state.users.findIndex((obj) => {
                    return obj['@rid'].toString() === self.state.activeUser['@rid'].toString();
                });
                const updatedUsersDelete = self.state.users;
                updatedUsersDelete.splice(activeIndex, 1);
                self.setState({
                    modalDeleteUser: !self.state.modalDeleteUser,
                    users: updatedUsersDelete
                });
            }
        );
    }

    //TODO: validate this works fully
    validateNewUser = () => {
        let pass = true;

        if (this.state.newUserName.length === 0 || this.state.newUserPassword.length === 0 || this.state.newUserPassword2.length === 0 || typeof this.state.newUserRole === 'undefined') {
            this.setState({
                errorMsg: 'All fields must have a given value'
            });
            pass = false;
        } else if (!this.state.newUserRole) {
            this.setState({
                errorMsg: 'Select a User Role'
            });
            pass = false;
        } else if (this.state.newUserPassword !== this.state.newUserPassword2) {
            this.setState({
                errorMsg: 'Password fields must match'
            });
            pass = false;
        } else {
            this.setState({
                errorMsg: ''
            });
        }

        return pass;
    }

    //TODO: add in cisInfo list per user!!! userList
    render() {

        const tdStyle = {
            verticalAlign: 'middle'
        };

        const userList = this.state.users.map((user, uIndex) => {
            if (user.name === 'admin') {
                return  <tr key={uIndex} id={user['@rid']}>
                            <th scope='row' style={tdStyle}>{uIndex}</th>
                            <td style={tdStyle}>{user.name}</td>
                            <td style={tdStyle}>{user.role}</td>
                            <td style={tdStyle}>'Add Score Info'</td>
                            <td style={tdStyle}><button className='btn-disabled'>Edit</button></td>
                            <td style={tdStyle}><button className='btn-disabled'>Delete</button></td>
                        </tr>;
            } else {
                return  <tr key={uIndex} id={user['@rid']}>
                            <th scope='row' style={tdStyle}>{uIndex}</th>
                            <td style={tdStyle}>{user.name}</td>
                            <td style={tdStyle}>{user.role}</td>
                            <td style={tdStyle}>'Add Score Info'</td>
                            <td style={tdStyle}><button onClick={this.toggleEdit}>Edit</button></td>
                            <td style={tdStyle}><button className='btn-red' onClick={this.toggleDelete}>Delete</button></td>
                        </tr>;
            }
        });

        return (
            <div>
                <div className='back-btn-container'>
                    <button onClick={this.props.backButton}>Back</button>
                </div>
                <div className='page-title'>
                    <h2>Manage Users</h2>
                </div>
                <Table className='user-list'>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>User Name</th>
                            <th>User Role</th>
                            <th>CIS List</th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {userList}
                        <tr key='newUser'>
                            <th scope='row' style={tdStyle}><button onClick={this.toggleCreate}>Create New User</button></th>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}></td>
                        </tr>
                    </tbody>
                </Table>
                <Modal show={this.state.modalCreateUser}>
                    <Modal.Header>
                        <Modal.Title componentClass='h3'>Create New User</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group controlId='newUserName' >
                                <Form.Label>User Name</Form.Label>
                                <Form.Control
                                autoFocus={true}
                                type='text'
                                value={this.state.newUserName}
                                onChange={this.handleChange}
                                />
                            </Form.Group>
                            <Form.Group controlId='newUserPassword' >
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                type='password'
                                value={this.state.newUserPassword}
                                onChange={this.handleChange}
                                />
                            </Form.Group>
                            <Form.Group controlId='newUserPassword2' >
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                type='password'
                                value={this.state.newUserPassword2}
                                onChange={this.handleChange}
                                />
                            </Form.Group>
                            <Form.Group controlId='newUserRole'>
                                <Form.Label>User Role</Form.Label>
                                <Form.Control componentClass='select' onChange={this.handleChange}>
                                    <option value='' disabled selected hidden>Select User Role...</option>
                                    <option value='admin'>Administrator</option>
                                    <option value='manager'>Manager</option>
                                    <option value='analyst'>Analyst</option>
                                    <option value='readonly'>Read Only</option>
                                </Form.Control>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <span className='form-error-msg'>{this.state.errorMsg}</span>
                        <button onClick={this.handleCreateUser}>Create User</button>
                        <button className='btn-red' onClick={this.toggleCreate}>Cancel</button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.modalEditUser}>
                    <Modal.Header>
                        <Modal.Title componentClass='h3'>{'Edit User: ' + this.state.activeUser.name}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p><strong>Current User Role:</strong>&nbsp;&nbsp;&nbsp;&nbsp;{this.state.activeUser.role}</p>
                        <Form>
                            <Form.Group controlId='newUserRole'>
                                <Form.Label>Change User Role</Form.Label>
                                <Form.Control componentClass='select' onChange={this.handleChange}>
                                    <option value='' disabled selected hidden>Select User Role...</option>
                                    <option value='admin'>Administrator</option>
                                    <option value='manager'>Manager</option>
                                    <option value='analyst'>Analyst</option>
                                    <option value='readonly'>Read Only</option>
                                </Form.Control>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <span className='form-error-msg'>{this.state.errorMsg}</span>
                        <button onClick={this.handleEditUser}>Save Changes</button>
                        <button className='btn-red' onClick={this.toggleEdit}>Cancel</button>
                    </Modal.Footer>
                </Modal>
                <Modal show={this.state.modalDeleteUser}>
                    <Modal.Header>
                        <Modal.Title componentClass='h2'>{'Are you sure you want to delete user: ' + this.state.activeUser.name + '?'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Footer>
                        <button onClick={this.handleDeleteUser}>Yes</button>
                        <button className='btn-red' onClick={this.toggleDelete}>Cancel</button>
                    </Modal.Footer>
                </Modal>
            </div>

        );
    }
}

export default ManageUsers;
