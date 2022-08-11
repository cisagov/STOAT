/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libaries*/
import * as React from 'react';
import * as uuid from 'uuid';
import * as moment from 'moment';

import Main from './ui/Main';
import LoginPortal from './ui/Options/LoginPortal';
import CriteriaEditor from './ui/Options/CriteriaEditor';
import ConfigurationEditor from './ui/Options/ConfigurationEditor';
import { Modal, FormGroup, FormControl } from 'react-bootstrap';
import { writeFile } from 'fs';

import './css/App.css';

export default class App extends React.Component {

    constructor() {
        super();
        this.state = {
            loadingPage: false,
            loginPage: true,
            mainPage: false,
            criteriaEditorPage: false,
            configurationEditorPage: false,
            username: '',
            password: '',
            tab: '1',
            errorMsg: '',
            server: null,
            database: null,
            modalExportCIS: false,
            exportCisList: [],
            pickedCisExport: '',
            chooseCisTitle: '',
            chooseCisButton: '',
        };

        this.handleLogout = this.handleLogout.bind(this);
        this.handleBack = this.handleBack.bind(this);
        this.handleSelectFromUserPortal = this.handleSelectFromUserPortal.bind(this);
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value,
        });
    }

    //TODO: make sure session is killed
    handleLogout = (event) => {
        this.setState({
            loginPage: true,
            mainPage: false,
            criteriaEditorPage: false,
            configurationEditorPage: false,
            username: '',
            password: ''
        });
    }

    handleBack = (event) => {
        this.setState({
            mainPage: true,
            loginPage: false,
            criteriaEditorPage: false,
            configurationEditorPage: false
        });
    }

    handleSelectFromUserPortal = (event) => {

        switch (event.target.innerHTML) {
            case 'Criteria Set Editor':
            this.setState({
              mainPage: false,
              loginPage: false,
              criteriaEditorPage: true,
              configurationEditorPage: false
            });
                break;
            case 'Configuration Editor':
                this.setState({
                    mainPage: false,
                    loginPage: false,
                    criteriaEditorPage: false,
                    configurationEditorPage: true
                });
                break;
            case 'Change Password':
                this.setState({
                    mainPage: false,
                    loginPage: false,
                    criteriaEditorPage: false,
                    configurationEditorPage: false
                });
                break;

            default:
                console.log('Invalid User Portal option.');
        }
    }

    handleSubmit = (event) => {
        const _self = this;
        event.preventDefault();
        const opts = {
            username: this.state.username,
            password: this.state.password,
            database: this.state.database
        };
        //If authentication suceeds, render Main component


        let url = process.env.REACT_APP_DB + '/setdatabase'
        fetch(url, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify(opts) 
        })
        .then(response => response.json())
        .then(response => {
            if (response.valid === true) {
                _self.setState({
                    loginPage: false,
                    mainPage: true,
                    errorMsg: ''
                });
            } else {
                _self.setState({
                    errorMsg: response.message
                });
            }            
        });
    }

    toggleExportCIS = (event) => {
        this.setState({
            modalExportCIS: !this.state.modalExportCIS
        });
    }

    // TODO: Fix this to work without electron remote
    exportSTIX = async function(sself) {
        const jsonRepObject = JSON.parse(sself.state.pickedCisExport);
        const filename = ' '//await remote.dialog.showSaveDialog({title: 'Create STIX from CIS', defaultPath: jsonRepObject.name + '_stix_bundle.json'});
        if (filename) {
            // console.log(filename);
            const stixData = {
                type: 'bundle',
                id: 'bundle--' + uuid.v4(),
                spec_version: '2.0',
                objects: []
            };

            stixData.objects.push({
                type: 'course-of-action',
                id: 'course-of-action--' + uuid.v4(),
                created: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                modified: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                name: jsonRepObject.name + '_courseOfAction',
                description: ''

            });
            const courseOfActionIndex = 0;

            stixData.objects.push({
                type: 'indicator',
                id: 'indicator--' + uuid.v4(),
                created: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                modified: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                name: jsonRepObject.name + '_indicator',
                pattern: "[file:name = 'PlaceHolderPatternREPLACEorDELETE.exe']",
                valid_from: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                labels: [''],
                description: ''
            });
            const indicatorIndex = 1;

            stixData.objects.push({
                type: 'malware',
                id: 'malware--' + uuid.v4(),
                created: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                modified: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                name: jsonRepObject.name + '_malware',
                labels: [''],
                description: ''
            });
            const malwareIndex = 2;

            stixData.objects.push({
                type: 'vulnerability',
                id: 'vulnerability--' + uuid.v4(),
                created: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                modified: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                name: jsonRepObject.name + '_vulnerability',
                description: ''
            });
            const vulnIndex = 3;

            stixData.objects.push({
                type: 'threat-actor',
                id: 'threat-actor--' + uuid.v4(),
                created: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                modified: moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
                name: jsonRepObject.name + '_threatActor',
                labels: [''],
                description: ''
            });
            const threatIndex = 4;

            for (const catObj of jsonRepObject.criteriaDefault) {
                for (const charObj of catObj.characteristics) {
                    for (const attObj of charObj.attributes) {
                        for (const scoreObj of attObj.scores) {
                            //Course of Action, Indicator
                            if (catObj.category === 'Defense Complexity') {
                                //Course of Action
                                if (charObj.characteristic === 'Difficulty to Fix') {
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[courseOfActionIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                } else if (charObj.characteristic === 'Difficulty to Detect') {  //Indicator
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[indicatorIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                }
                            } else if (catObj.category === 'Exploit, Malware, and Vulnerability') { //Malware, Vulnerability
                                //Malware, Vulnerability
                                if (charObj.characteristic === 'Urgency') {
                                    //Malware
                                    if (attObj.attribute === 'Mobility of Infection') {
                                        //Check for chosen options
                                        if (scoreObj.chosen) {
                                            stixData.objects[malwareIndex].description += ' [ '  + scoreObj.description + ' ]';
                                        }
                                    } else if (attObj.attribute === 'Past Incident Source/Credibility') {  //Vulnerability
                                        //Check for chosen options
                                        if (scoreObj.chosen) {
                                            stixData.objects[vulnIndex].description += ' [ '  + scoreObj.description + ' ]';
                                        }
                                    } else if (attObj.attribute === 'Availability') {//Vulnerability
                                        //Check for chosen options
                                        if (scoreObj.chosen) {
                                            stixData.objects[vulnIndex].description += ' [ '  + scoreObj.description + ' ]';
                                        }
                                    }
                                } else if (charObj.characteristic === 'Maturity/Sophistication') {//Malware
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[malwareIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                } else if (charObj.characteristic === 'Functional Impact') {  //Malware
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[malwareIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                }
                            } else if (catObj.category === 'Adversary') {//Threat Actor
                                //Threat Actor
                                if (charObj.characteristic === 'Motivation') {
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[threatIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                } else if (charObj.characteristic === 'Capability') { //Threat Actor
                                    //Check for chosen options
                                    if (scoreObj.chosen) {
                                        stixData.objects[threatIndex].description += ' [ '  + scoreObj.description + ' ]';
                                    }
                                }
                            }
                        }
                    }
                }
            }

            writeFile(filename, JSON.stringify(stixData), (err) => {
                if (err) { throw err; }
            });
        }

        sself.setState({
            modalExportCIS: false
        });
    };

    render() {

        const cisDropdown = this.state.exportCisList.map((cis, cIndex) => {
            return <option key={cIndex} value={cis.jsonRep}>{cis.name}</option>;
        });

        return (
            <div className = 'Wrapper' /*style={{ backgroundImage: `url(${background})` }}*/>
                {/* <Header /> */}
                {/* this.state.loadingPage && <LoadingPage msg='Preparing Database'/>*/}
                { this.state.loginPage && <LoginPortal uname={this.state.username} passwd={this.state.password} errorMsg={this.state.errorMsg} handleChange={this.handleChange} handleSubmit={this.handleSubmit}/> }
                { this.state.mainPage && <Main tab={this.state.tab} db={this.state.database} logout={this.handleLogout} uportal={this.handleSelectFromUserPortal}/> }
                { this.state.criteriaEditorPage && <CriteriaEditor db={this.state.database} logout={this.handleLogout} backButton={this.handleBack}/>}
                { this.state.configurationEditorPage && <ConfigurationEditor db={this.state.database} logout={this.handleLogout} backButton={this.handleBack}/>}
                <Modal show={this.state.modalExportCIS}>
                    <Modal.Header>
                        <Modal.Title componentClass='h2'>{this.state.chooseCisTitle}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form>
                            <FormGroup controlId='pickedCisExport'>
                                <FormControl componentClass='select' onChange={this.handleChange}>
                                    <option value='' disabled selected hidden>Choose CIS...</option>
                                    {cisDropdown}
                                </FormControl>
                            </FormGroup>
                        </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <button onClick={() => this.state.chooseCisButtonFunc(this)}>{this.state.chooseCisButtonText}</button>
                        <button className='btn-red' onClick={this.toggleExportCIS}>Cancel</button>
                    </Modal.Footer>
                </Modal>
            </div>
        );

  }
}
