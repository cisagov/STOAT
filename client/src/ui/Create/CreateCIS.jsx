/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import { Button, Form, Col, Row, Container} from 'react-bootstrap';
import ImportCIS from './ImportCIS';
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
class CreateCIS extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            cisName: '',
            cisDescription: '',
            cisConfiguration: '',
            criteriaSet: '',
            cisTicket: '',
            cisTicketMemo: '',
            configurations: [],
            showImportCIS: false
        };
    }
    
    validateForm() {
        let bool = this.state.cisName.length > 0 && this.state.cisDescription.length > 0 && this.state.cisConfiguration.length > 0;

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

    

    createDefault = async function(componentThis) {
        console.log(this.props.uid);

        let cis = {
            name: this.state.cisName,
            description: this.state.cisDescription,
            criteriaSet: 'default',
            status: 'progress',
            profile: 'emv'
        }

        let url = process.env.REACT_APP_DB + '/createScore';
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({cis: cis, owner: this.props.uid, configuration: this.state.cisConfiguration})
        })
        .then(response => response.json())
        .then(response => {
            console.log(response)
            componentThis.props.setCurrentCIS(response);
            //Go to Scoring View
            componentThis.props.changeTab(componentThis.props.scoreTabKey);
        })  
    };

    createCIS = (event) => {

        // Show loading animation
        let button = document.getElementById('cis-button-wrapper').childNodes[0]
        button.disabled = true
        button.innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>Loading...'

        event.preventDefault();

        this.createDefault(this);

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
                return(<option key={cIndex} value={conFig['@rid'].toString()}>{conFig.name}</option>);
        });

        return (
            <div>
                <Form.Check id='create-cis-container'
                    onSubmit={this.props.handleSubmit}>
                    <Container>
                        <Row>
                            <Col>
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
                            <Col>
                                <div id='cis-ticket-wrapper'>
                                    <Form.Group controlId='cisTicket' >
                                        <Form.Label>Ticket #</Form.Label>
                                        <Form.Control
                                        type='text'
                                        value={this.state.cisTicket}
                                        onChange={this.handleChange}
                                        />
                                    </Form.Group>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div id='cis-ticket-memo-wrapper'>
                                    <Form.Group controlId='cisTicketMemo' >
                                        <Form.Label>Ticket Memo</Form.Label>
                                        <Form.Control
                                        type='text'
                                        value={this.state.cisTicketMemo}
                                        onChange={this.handleChange}
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
                            <Col className='mx-auto' lg={3}>
                                <div id='cis-button-wrapper'>
                                    <Button
                                    block={true}
                                    
                                    disabled={!this.validateForm()}
                                    onClick={this.createCIS}
                                    type='submit'
                                    >
                                    Begin Scoring
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </Form.Check>
                <ImportCIS uid={this.props.uid} configList={configList} setCurrentCis={this.props.setCurrentCIS} changeTab={this.props.changeTab} scoreTabKey={this.props.scoreTabKey}/>
            </div>
        );

    }
}

export default CreateCIS;
