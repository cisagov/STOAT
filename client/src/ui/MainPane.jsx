/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import Modal from 'react-bootstrap/Modal';
import  Form from 'react-bootstrap/Form';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import SplitPane from 'react-split-pane';
/*Custom*/
import FinishComponent from './Finish/FinishComponent';
import CreateComponent from './Create/CreateComponent';
import ScoringComponent from './Scoring/ScoringComponent';
import ScoringSelection from "./Options/ScoringSelection";
import UserPortal from './UserPortal';
import logo from './../assets/STOAT_Masthead.png';

/*Style*/
const divStyle = {
  width: '100%',
};

/*
  This is the main driver for the application, holding all components held within.
*/
export default class MainPane extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      key: this.props.tab,
      currentCIS: null,
      modalImportCIS: false,
      hwConfigList: [],
      pickedHwConfig: ''
    };

    this.setCurrentCIS = this.setCurrentCIS.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
  }

  //TODO: bust out component update on creation of a new hardware configuration
  
  /*
   componentDidMount() {
      ipcRenderer.on('cis_import_selected', async () => {
          console.log('CLICKED: Import CIS');
          const hwList = await this.props.db.select().from('Configuration').all();
          console.log(hwList);
          this.setState({
              modalImportCIS: true,
              hwConfigList: hwList
          });
      });
  }
  */
 
   handleChange = (event) => {
      this.setState({
          [event.target.id]: event.target.value,
      });
  }

   handleSelect = (key) => {
    this.setState({ key });
  }

  /*setCurrentCISID*/
   setCurrentCIS = async function(cisObject) {
    this.setState({ currentCIS: cisObject}, () => console.log('after setting Current CIS in MainPane', this.state.currentCIS));
  };


  toggleImportCIS = (event) => {
      this.setState({
          modalImportCIS: !this.state.modalImportCIS
      });
  }

   render() {

    const hwConfigDropdown = this.state.hwConfigList.map((hw, hIndex) => {
      return <option key={hIndex} value={hw['@rid'].toString()}>{hw.name}</option>;
    });

    return (
      <div>
        <div>
          <div className='App-header'>
              <img src={logo} className='Masthead' alt='STOAT logo'></img>
              <UserPortal db={this.props.db} uportal={this.props.uportal}/>
              <div id='header-btn-container'>
                  <span id='btn-logout' onClick={this.props.logout}> Log-Out </span>
              </div>
          </div>

          <div className='_mainPane' style={divStyle}>
            <Tabs
              activeKey={this.state.key}
              onSelect={this.handleSelect}
              id='ourTabController'
              mountOnEnter={true}
              unmountOnExit={true}
            >
              <Tab eventKey={0} title = 'Home'>
                <ScoringSelection currentCIS={this.state.currentCIS} setCurrentCIS={this.setCurrentCIS}/>
              </Tab>
              <Tab eventKey={1} title = 'Create New Score'>
                <CreateComponent changeTab={this.handleSelect} setCurrentCIS={this.setCurrentCIS} scoreTabKey={2} />
              </Tab>
              <Tab eventKey={2} title = 'Score Editor'>
                <ScoringComponent currentCIS={this.state.currentCIS} setCurrentCIS={this.setCurrentCIS}/>
              </Tab>
              <Tab eventKey={3} title = 'Reports'>
                <FinishComponent currentCIS={this.state.currentCIS} setCurrentCIS={this.setCurrentCIS}/>
              </Tab>
            </Tabs> 
          </div>
        </div>

        <Modal show={this.state.modalImportCIS}>
            <Modal.Header>
                <Modal.Title componentClass='h2'>{'Choose Hardware Configuration for Imported CIS'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form>
                    <Form.Group controlId='pickedHwConfig'>
                        <Form.Control componentClass='select' onChange={this.handleChange}>
                            <option value='' disabled selected hidden>Choose Configuration...</option>
                            {hwConfigDropdown}
                        </Form.Control>
                    </Form.Group>
                </form>
            </Modal.Body>
            <Modal.Footer>
                <button onClick={() => this.importCIS(this)}>Import</button>
                <button className='btn-red' onClick={this.toggleImportCIS}>Cancel</button>
            </Modal.Footer>
        </Modal>
      </div>
    );
  }
}
