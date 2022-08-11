/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import {Form, ListGroup, ListGroupItem, ProgressBar, Button, Tab, Nav, Row, Col, Container} from 'react-bootstrap';

/*
  Functionality that shows the scoring list and handles the application's state of which item from the list
  is selected
*/
class ScoringList extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      progressList: [],
      vulnArray: [],
      selectedName: ''
    };

  }

  async componentDidMount() {

    let url = process.env.REACT_APP_DB + "/progresslist"

    fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(pList => {
      this.setState({
        progressList: pList
      })
    })

    if (this.props.currentCIS && this.props.currentCIS.profile === 'vulnerability') {
      //await this.getVulnArray()
      await this.getWeaknessArray()
    }

    
  }

  async componentDidUpdate(prevProps) {
    if (this.props.currentCIS !== prevProps.currentCIS || this.props.updateInfo !== prevProps.updateInfo) {
      await this.setState({cisProgress: this.props.currentCIS?.progress})
      await this.updateComponent();
    }

    if (this.props.updateProgress !== prevProps.updateProgress) {
      this.updateProgress()
    }
  }

  async updateComponent() {

    if (this.props.currentCIS && this.props.currentCIS.profile === 'vulnerability') { 
      // Uncomment this when it's time to implement CVE scoring
      //await this.getVulnArray()
      await this.getWeaknessArray()
    }
  }

  updateProgress = () => {
    let updateVuln = this.props.updateProgress

    if (updateVuln) {
      let vulnArray = this.state.vulnArray
      let index = vulnArray.findIndex(v => v['@rid'] === updateVuln.id)
      if (index === -1) {
        let weaknessArray = this.state.weaknessArray 
        index = weaknessArray.findIndex(v => v['@rid'] === updateVuln.id)
        if (index > -1) { 
          weaknessArray[index].totalChosen = updateVuln.progress.totalChosen 
          weaknessArray[index].totalDefault = updateVuln.progress.totalDefault
          this.setState({
            weaknessArray: weaknessArray
          })
        }
      } else {
        vulnArray[index].totalChosen = updateVuln.progress.totalChosen 
        vulnArray[index].totalDefault = updateVuln.progress.totalDefault
        this.setState({
          vulnArray: vulnArray
        })
      }
      
    }
  }

  getVulnArray = async () => {
    if (this.props.currentCIS) {
      let cisID = this.props.currentCIS["@rid"].toString();

      let url = process.env.REACT_APP_DB + "/getVulnArray";
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cisID: cisID
        })
      })
      .then(response => response.json())
      .then(async (response) => {
        response.sort((a,b) => (a.name > b.name) ? 1 : -1)
        await this.setState({vulnArray: response, selectedVuln: response[0]})
        await this.props.setCurrentVuln(response[0]);
        this.getScoreProgress()
      })
    }
  }

  getWeaknessArray = async () => {
    console.log('Weakness array')
    if (this.props.currentCIS) {
      let cisID = this.props.currentCIS["@rid"].toString();

      let url = process.env.REACT_APP_DB + "/getWeaknessArray"
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cisID: cisID
        })
      }).then(response => response.json())
      .then(async (response) => {
        response.sort((a,b) => (parseInt((a.name.split('-'))[1]) > parseInt((b.name.split('-'))[1])) ? 1 : -1)
        await this.setState({weaknessArray: response, selectedVuln: response[0]})
        await this.props.setCurrentVuln(response[0])
        await this.getScoreProgress()
      })
    }
  }

  getScoreProgress = async () => {
    console.log('cisProgress: ', this.state.vulnArray)
    let numVulns = this.state.vulnArray?.length
    let numWeaknesses = this.state.weaknessArray?.length
    let numVulnsChosen = this.state.vulnArray?.filter(v => v.finished).length
    let numWeaknessesChosen = this.state.weaknessArray?.filter(w => w.finished).length

    console.log(`cisProgress: ${numVulnsChosen} + ${numWeaknessesChosen} / ${numVulns} + ${numWeaknesses}`)

    if (!numVulns) {
      numVulns = 0
    }

    if (!numWeaknesses) {
      numWeaknesses = 0
    }

    if (!numVulnsChosen) {
      numVulnsChosen = 0
    }

    if (!numWeaknessesChosen) {
      numWeaknessesChosen = 0
    }

    console.log(`cisProgress: ${numVulnsChosen} + ${numWeaknessesChosen} / ${numVulns} + ${numWeaknesses}`)

    // Remove comments after implementing CVE scoring
    let progress = Math.round(((/*numVulnsChosen + */numWeaknessesChosen) / (/*numVulns + */numWeaknesses)) * 100)

    console.log('cisProgress: ', progress)

    this.setState({
      cisProgress: progress
    }, () => console.log('cisProgress: ', this.state.cisProgress))
  }

  getProgress = async (id) => {
      let url = process.env.REACT_APP_DB + "/getCatArray";
      let catArray = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cisID: id
        })
      })
      .then(response => response.json())

      let total = 0;
      let completed = 0;
      catArray.forEach(cat =>  {
        cat.characteristics.forEach(charac => {
          charac.attributes.forEach(attr => {
            if (attr.scores.some(s => s.chosen)) {
              completed++
            }

            total++
          })
        })
      })

      console.log(`Total: ${total} Completed: ${completed}`)
      console.log("Progress: ", completed / total)

      return (completed / total).toFixed(1)
  }

  markFinished = (id) => {
    let vulnArray = this.state.vulnArray
    let index = vulnArray.findIndex(v => v['@rid'] === id)
    if (index === -1) {
      let weaknessArray = this.state.weaknessArray
      index = weaknessArray.findIndex(w => w['@rid'] === id)
      if (index > -1) {
        weaknessArray[index].finished = true
        this.setState({weaknessArray: weaknessArray})
      }
    } else {
      vulnArray[index].finished = true

      this.setState({
        vulnArray: vulnArray
      })
    }

    let url = process.env.REACT_APP_DB + '/update'
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: id,
        data: {
          finished: true
        }
      })
    })

    this.getScoreProgress()
  }

  handleClick = async (selected) => {
    await this.props.setCurrentVuln(selected);
  }

  handleChange = async (event) => {
    console.log(this.state.progressList[event.target.value])
    await this.props.setCurrentCIS(this.state.progressList[event.target.value])
  }


  generateFakeData = async () => {
    let id = this.props.currentCIS['@rid'].toString()
    let url = process.env.REACT_APP_DB + '/fakedata'
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: id
      })
    })
  }

  render() {

      const lgiStyle = {
          textAlign: 'center',
          fontSize: '1.2em',
          color: '#000',
          marginTop: '5px'
      };

      //let cisList = []
      const cisList = this.state.progressList.map((cis, cIndex) => {
        return(<option key={cIndex} value={this.state.progressList.indexOf(cis)}>{cis.name}</option>);
      });

      // const vulnList = this.state.vulnArray.map((vuln, vIndex) => {
      //   return(<ListGroupItem className='btn btn-secondary' style={lgiStyle} key={this.state.vulnArray.indexOf(vuln)} onClick={ () => this.handleClick(vuln)}>{vuln.name}</ListGroupItem>)
      // })
      
      let vulnList = []
      this.state.vulnArray.map((vuln, i) => {
        if (vuln != null) {
          let finishButton = null
          let progressBar = null
          let finishCheck = null 
          
          if (vuln.finished) {
            finishCheck = <span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                                <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                              </svg>
                          </span>
          } else {
            if ((vuln.totalChosen / vuln.totalAttributes) >= 1) {
              finishButton = <Button onClick={() => this.markFinished(vuln['@rid'])}>Mark Finished</Button>
            }
            progressBar = (<ProgressBar>
              <ProgressBar now={((vuln.totalChosen - vuln.totalDefault) / vuln.totalAttributes)*100} variant='success'/>
              <ProgressBar now={(vuln.totalDefault / vuln.totalAttributes)*100} variant='info' label='Default'/>
             </ProgressBar>)
          }

          
          // console.log(`Chosen: ${vuln.totalChosen} Default: ${vuln.totalDefault} Total: ${vuln.totalAttributes}`)
          if (this.props.currentVuln) {
            if (vuln.name === this.props.currentVuln.name) {              
              vulnList.push(<ListGroupItem className='btn btn-info' style={lgiStyle} key = {i} onClick={ () => this.handleClick(vuln)} active>
                              {finishCheck}
                              {vuln.name}
                              {progressBar}
                              {finishButton}
                            </ListGroupItem>)
              
            } else {
              vulnList.push(
                <ListGroupItem className='btn btn-secondary' style={lgiStyle} key = {i} onClick={ () => this.handleClick(vuln)}>
                  {finishCheck}
                  {vuln.name} 
                  {progressBar}
                </ListGroupItem>
              )
            }
          } else { 
            vulnList.push(
              <ListGroupItem className='btn btn-secondary' style={lgiStyle} key = {i} onClick={ () => this.handleClick(vuln)}>
                {finishCheck}
                {vuln.name} 
                {progressBar}
              </ListGroupItem>
            )
          }
        } else { 
          vulnList.push(
            <ListGroup.Item className="btn btn-secondary" style={lgiStyle} key = {this.state.vulnArray.indexOf(vuln)} onClick={ () => this.handleClick(vuln)}>{vuln.name}</ListGroup.Item>
          )
        }
      })

      let weaknessList = []
      if (this.state.weaknessArray) {
        this.state.weaknessArray.map((weakness, i) => {
          if (weakness != null) {
            let finishButton = null
            let progressBar = null
            let finishCheck = null 
            
            if (weakness.finished) {
              finishCheck = <span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
                                  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                </svg>
                            </span>
            } else {
              if ((weakness.totalChosen / weakness.totalAttributes) >= 1) {
                finishButton = <Button onClick={() => this.markFinished(weakness['@rid'])}>Mark Finished</Button>
              }
              progressBar = (<ProgressBar>
                <ProgressBar now={((weakness.totalChosen - weakness.totalDefault) / weakness.totalAttributes)*100} variant='success'/>
                <ProgressBar now={(weakness.totalDefault / weakness.totalAttributes)*100} variant='warning' label='Default'/>
              </ProgressBar>)
            }

            
            // console.log(`Chosen: ${vuln.totalChosen} Default: ${vuln.totalDefault} Total: ${vuln.totalAttributes}`)
            if (this.props.currentVuln) {
              if (weakness.name === this.props.currentVuln.name) {              
                weaknessList.push(<ListGroupItem className='btn btn-info' style={lgiStyle} key = {i} onClick={ () => this.handleClick(weakness)} active>
                                {finishCheck}
                                {weakness.name}
                                {progressBar}
                                {finishButton}
                              </ListGroupItem>)
                
              } else {
                weaknessList.push(
                  <ListGroupItem className='btn btn-secondary' style={lgiStyle} key = {i} onClick={ () => this.handleClick(weakness)}>
                    {finishCheck}
                    {weakness.name} 
                    {progressBar}
                  </ListGroupItem>
                )
              }
            } else { 
              vulnList.push(
                <ListGroupItem className='btn btn-secondary' style={lgiStyle} key = {i} onClick={ () => this.handleClick(weakness)}>
                  {finishCheck}
                  {weakness.name} 
                  {progressBar}
                </ListGroupItem>
              )
            }
          } else { 
            weaknessList.push(
              <ListGroup.Item className="btn btn-secondary" style={lgiStyle} key = {this.state.vulnArray.indexOf(weakness)} onClick={ () => this.handleClick(weakness)}>{weakness.name}</ListGroup.Item>
            )
          }
        })
      }

      // Find the index of currentCIS in progressList, then set it as the value used in the <select>
      let value = ''
      if (this.props.currentCIS) {
        let cis = this.state.progressList.filter(e => e['@rid'] === this.props.currentCIS['@rid'])
        value = this.state.progressList.indexOf(cis[0])
      }

    return (

      <div id='ScoringList'>

        <div className='CisList'>
          <h4>Scores</h4>
          <Form.Control as="select" value={value} onChange={this.handleChange} required>
              <option value='' disabled hidden>Select Score</option>
              {cisList}
          </Form.Control>
          
          <div className='OverallScoreProgress'>{ this.state.cisProgress !== undefined && <><h4>Score Progress</h4><ProgressBar now={this.state.cisProgress} label={this.state.cisProgress + '%'}/></> }</div>
          {/* <Button onClick={this.generateFakeData}>Fake Data</Button> */}

          {/* <Tab.Container id="left-tabs-example" defaultActiveKey="first">
            <Row>
              <Col lg={4}>
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey="first">Vulnerabilities</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="second">Weaknesses</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>
              <Col lg={8}>
                <Tab.Content>
                  <Tab.Pane eventKey="first">
                    {
                      vulnList.length > 0 && <div><h4>Vulnerabilities</h4><ListGroup>{vulnList}</ListGroup></div>
                    }
                  </Tab.Pane>
                  <Tab.Pane eventKey="second">               
                    {
                      weaknessList.length > 0 && <div><h4>Weaknesses</h4><ListGroup>{weaknessList}</ListGroup></div>
                    }
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container> */}
          {
            weaknessList.length > 0 && <div><h4>Weaknesses</h4><ListGroup>{weaknessList}</ListGroup></div>
          }

        </div>
      </div>

    );
  }
}

export default ScoringList;
