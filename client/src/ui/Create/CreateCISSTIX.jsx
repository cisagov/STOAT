/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import { config } from 'dotenv';
import * as React from 'react';
import { Button, Form, Col, Row, Container, Toast, ProgressBar} from 'react-bootstrap';

const axios = require('axios')
/*Custom*/

/*
  Manages the creation of Cyber Issue and moves to the Scoring tab
  TODO: Call CreateFunctions method rather than duplicating inside this file
  TODO: Validate Input and make sure Configuration and Criteria Set are selected
  TODO: Sanitize inputs
  TODO: Allow customizing and selecting different Critera Sets
  TODO: Check to see if CIS is already created  under that name and Configuration
  TODO: Test updating react-bootstrap
*/
class CreateCISSTIX extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            cisName: '',
            cisDescription: '',
            cisConfiguration: '',
            criteriaSet: '',
            cisTicket: '',
            cisTicketMemo: '',
            cisProfile: '',
            cisBundle: '',
            cisStixBundle: '',
            configurations: [],
            file: null,
            showImportCIS: false,
            showToast: false,
            toastMessage: '',
            showProgress: false,
            progress: 0,
            progressMessage: ''
        };
    }
    
    validateForm() {
        let bool = this.state.cisName.length > 0 && this.state.cisDescription.length > 0 && this.state.cisProfile.length > 0 && this.state.file && this.state.cisConfiguration.length > 0

        return bool
    }

    componentDidMount() {
        const self = this;
        let url = process.env.REACT_APP_DB + "/configuration";
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(response => {
            self.setState({
                configurations: response
            })
        })
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value,
        });
    }

    createDefault = function(componentThis) {

        let data = new FormData();
        var bundle = document.getElementById('file').files[0]
        data.append('bundle', bundle);

        let cis = {
            name: this.state.cisName,
            description: this.state.cisDescription,
            criteriaSet: 'default',
            status: 'progress'
        }

        data.append('cis', JSON.stringify(cis))
        data.append('owner', this.props.uid)
        data.append('configuration', this.state.cisConfiguration)
        data.append('profile', this.state.cisProfile)

        let url = process.env.REACT_APP_DB + '/createScore';

        this.setState({showProgress: true})
        
        axios({
            url: url,
            method: 'POST',
            data: data,
            onDownloadProgress: (event) => {
                const dataChunk = event.currentTarget.response
                let chunks = dataChunk.split('|')
                let curData = JSON.parse(dataChunk.split('|').pop())

                this.setState({progressMessage: curData.task, progress: curData.progress})
            }
        })
        .then(async (response) => {
            this.setState({progress: 100}, async () => {
                console.log(response)
                let data = JSON.parse(response.data.split('|').pop())
                console.log(data)
                
                if (data.valid) {
                    url = process.env.REACT_APP_DB + '/select'

                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: data.cis
                        })
                    }).then(response => response.json()).then(async (response) => {
                        await componentThis.props.setCurrentCIS(response);
                        //Go to Scoring View
                        componentThis.props.changeTab(componentThis.props.scoreTabKey);
                    })

                    
                } else {
                    this.toggleLoadingButton()
                    console.log(data.message)
                    this.setState({
                        toastMessage: data.message,
                        showToast: true
                    })
                }
            })
            
            
        })  
    };

    toggleToast = () => {
        this.setState({
            showToast: !this.state.showToast
        })
    }

    createCISSTIX = (event) => {
        this.toggleLoadingButton()
        event.preventDefault();
        this.createDefault(this);
    }
    
    toggleLoadingButton = () => {
        let button = document.getElementById('cis-button-wrapper').childNodes[0]
        if (button.disabled) {
            button.disabled = false
            button.innerHTML = "Begin Scoring"
        } else {
            button.disabled = true
            button.innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>Loading...'
        }
    }

    /*    //This is to be added to render() below when criteriaSets can be edited within the application.
          //'default' is the only currently working criteriaSet

    <div id='cis-criteria-wrapper'>
        <FormGroup controlId='criteriaSet'>
            <ControlLabel>Criteria Set</ControlLabel>
            <FormControl componentClass='select' onChange={this.handleChange}>
                <option value='' disabled selected hidden>Select Criteria Set</option>
                <option value='default'>Default</option>
            </FormControl>
        </FormGroup>
    </div>*/

    

    render() {

        const configList = this.state.configurations.map((conFig, cIndex) => {
            if (conFig.name === 'Software') {
                this.state.cisConfiguration = conFig['@rid'].toString()
            }
            
            return(<option key={cIndex} value={conFig['@rid'].toString()}>{conFig.name}</option>);
        });

        return (
            <div>
                <Form.Check id='create-cis-container'
                    onSubmit={this.props.handleSubmit}>
                    <Container>
                        <Row>
                            <Col>
                                <div id='cis-profile-wrapper'>
                                    <Form.Group controlId='cisProfile'>
                                        <Form.Label>Scoring Profile</Form.Label>
                                        <Form.Control as='select' defaultValue='' onChange={this.handleChange}>
                                            <option value='' disabled hidden>Select Scoring</option>
                                            <option key= '0' value='attack' >Attack Surface</option>
                                            <option key= '1' value='structure' >Structure</option>
                                            <option key= '2' value='vulnerability' >CWE/CVE</option>
                                        </Form.Control>
                                    </Form.Group>
                                </div>
                            </Col>
                            <Col className='d-none'>
                                <div id='cis-config-wrapper'>
                                    <Form.Group controlId='cisConfiguration'>
                                        <Form.Label>Configuration</Form.Label>
                                        <Form.Control as="select" defaultValue='' onChange={this.handleChange} required>
                                                <option value='' disabled hidden>Select Configuration</option>
                                                {configList}
                                        </Form.Control>
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div id='cis-name-wrapper'>
                                    <Form.Group controlId='cisName' >
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                        type='text'
                                        value={this.state.cisName}
                                        onChange={this.handleChange}
                                        required
                                        />
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div id='cis-desc-wrapper'>
                                    <Form.Group controlId='cisDescription' >
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control
                                        type='text'
                                        value={this.state.cisDescription}
                                        onChange={this.handleChange}
                                        required
                                        />
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div id='cis-bundle-wrapper'>
                                    <Form.Group controlId='cisFile'>
                                        <Form.Label>STIX bundle</Form.Label>
                                        <Form.File id='file' label={this.state.file ? this.state.file.split('\\')[2] : '...'} onChange={this.handleChange} custom required/>
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col className='mx-auto' lg={3}>
                                <div id='cis-button-wrapper'>
                                    <Button
                                    block={true}
                                    
                                    disabled={!this.validateForm()}
                                    onClick={this.createCISSTIX}
                                    type='submit'
                                    >
                                        Begin Scoring
                                    </Button>
                                    {/* <Button
                                    block={true}
                                    disable={!this.validateForm()}
                                    onClick={this.createFakeCIS}
                                    type='submit'
                                    >
                                        Begin Scoring (With Random Data)
                                    </Button> */}
                                </div>
                            </Col>                            
                        </Row>
                        <Row>
                            <Col className='mx-auto'>
                                <span className='mx-auto'>{this.state.progressMessage}</span>
                            </Col>
                        </Row>
                        <Row>
                            <Col lg={12}>
                                {this.state.showProgress && <ProgressBar now={this.state.progress} label={this.state.progress + '%'}/>}
                            </Col>
                        </Row>

                    </Container>
                </Form.Check>

                <Toast show={this.state.showToast} onClose={this.toggleToast}>
                    <Toast.Header>
                        <div className='text-dark'>
                           Error
                        </div>
                    </Toast.Header>
                    <Toast.Body>
                        <div className='text-dark'>
                           {this.state.toastMessage} 
                        </div>
                    </Toast.Body>
                </Toast>

            </div>
        );

    }
}

export default CreateCISSTIX;