import * as React from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

class ImportCIS extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            show: false,
            cisConfiguration: '',
            file: null
        }
    }

    handleShow = () => this.setState({show: true})
    handleClose = () => this.setState({show: false})

    readFile = () => {
        let reader = new FileReader()

        reader.onloadend = () => {
            console.log(reader.result)

            let parsedData = JSON.parse(reader.result)
            
            let url = process.env.REACT_APP_DB + '/import'

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cis: parsedData,
                    owner: this.props.uid,
                    configuration: this.state.cisConfiguration
                })
            }).then(response => response.json())
            .then(response => {
                // let cis = JSON.parse(response)
                // Change to Scoring View and set currentCIS
                this.props.setCurrentCis(response)
                this.props.changeTab(this.props.scoreTabKey)
            })


        }

        reader.readAsText(document.getElementById('file').files[0])
    }

    validateForm = () => {

        let hasFile = this.state.file
        let hasConfiguration = this.state.cisConfiguration !== ''

        return hasFile && hasConfiguration
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value,
        });
    }

    render() {
        return (
            <div>
                <Button onClick={this.handleShow}>Import Score</Button>
                <Modal show={this.state.show} onHide={this.handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Import Score</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <Form.Check>
                            <Form.File id="file" label={this.state.file ? this.state.file.split('\\')[2] : '...'} onChange={this.handleChange} custom required/>
                            <Form.Label>Configuration</Form.Label>
                            <Form.Control id='cisConfiguration' as="select" onChange={this.handleChange} required>
                                    <option value='' disabled selected hidden>Select Configuration</option>
                                    {this.props.configList}
                            </Form.Control>
                        </Form.Check>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button variant="primary" onClick={this.readFile} disabled={!this.validateForm()}>Import</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        )
    }
}

export default ImportCIS;