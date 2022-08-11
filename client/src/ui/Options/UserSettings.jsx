/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import * as CryptoJS from 'crypto-js';
import { Button, Form } from 'react-bootstrap';

/*
  Functionality to manage user settings
  In this case, the only 'setting' that can be managed is changing the user's password
*/
class UserSettings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
          oldpw: '',
          newpw: '',
          newpw2: '',
          errorMsg: ''
        };
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value,
        });
    }

    handleSubmit = (event) => {
        const self = this;
        event.preventDefault();
        const queryOptions = {
            name: this.props.uname,
            password: CryptoJS.SHA512(this.state.oldpw).toString()
        };

        if (this.state.newpw !== this.state.newpw2) {
            this.setState({
                errorMsg: 'New password fields do not match',
                newpw: '',
                newpw2: ''
            });
        } else {
            let url = process.env.REACT_APP_DB + '/users'
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    opts: queryOptions
                })
            }).then(response => response.json())
            .then(
                function(result) {
                    console.log('Found User:', result);
                    if (typeof result !== 'undefined') {
                        let url = process.env.REACT_APP_DB + '/update'
                        fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id: result['@rid'],
                                data: {
                                    password: CryptoJS.SHA512(self.state.newpw).toString()
                                }
                            })
                        }).then(response => response.json())
                        .then(
                            function(update) {
                                console.log('Changed password of ' + self.props.uname);
                                self.props.logout();
                            }
                        );
                    } else {
                        self.setState({
                            errorMsg: 'Incorrect password',
                            oldpw: ''
                        });
                    }
                },
            );
        }
    }

    validateForm() {
        return this.state.oldpw.length > 0 && this.state.newpw.length > 0 && this.state.newpw2.length > 0;
    }

    render() {
        return (
            <div>
                <div className='back-btn-container'>
                    <button onClick={this.props.backButton}>Back</button>
                </div>
                <div className='Login'>
                    <Form onSubmit={this.handleSubmit}>
                        <Form.Group controlId='oldpw' >
                            <Form.Label>Old Password</Form.Label>
                            <Form.Control
                                autoFocus={true}
                                type='password'
                                value={this.state.oldpw}
                                onChange={this.handleChange}
                            />
                        </Form.Group>
                        <Form.Group controlId='newpw' >
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type='password'
                                value={this.state.newpw}
                                onChange={this.handleChange}
                            />
                        </Form.Group>
                        <Form.Group controlId='newpw2' >
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control
                                type='password'
                                value={this.state.newpw2}
                                onChange={this.handleChange}
                            />
                        </Form.Group>
                        <span className='form-error-msg'>{this.state.errorMsg}</span>
                        <Button
                            block={true}
                            
                            disabled={!this.validateForm()}
                            type='submit'
                        >
                            Submit
                        </Button>
                    </Form>
                </div>
            </div>
        );
    }
}

export default UserSettings;
