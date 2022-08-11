/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
//import ReactDOM from 'reactdom';
import Select from 'react-select';
import SplitPane from 'react-split-pane'
//import style from 'bootstrap';
//import * as ReactBootstrap from 'react-bootstrap';
import { Nav, Tab, Table, Form, Row, Col, Container } from 'react-bootstrap';
/*Custom*/
import './../../css/App.css'
import { updateJsonRep } from './ScoringFuncs';
import InfoSection from './InfoSection';

/*
  Handles functionality for all things scoring within the application
*/ 
class ScoringView extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      infoSectionUpdate: null,
      cis: null,
    };
  }

   async componentDidMount() {
    await this.updateComponent();
  }

   async componentDidUpdate(prevProps) {
    if (this.props.currentCIS !== prevProps.currentCIS) {
      await this.updateComponent();
    }
  }

  async updateComponent() {
    this.setState({cis: this.props.currentCIS});
  }

  setInfoSection = async (selected) => {
    this.setState({infoSectionUpdate: selected});
  }

   render() {
    if (this.props.currentVuln) {
      //console.log('Scoring view selected vuln: ', this.props.currentVuln.name)
    }
    if (!this.props.currentCIS) {
        return (
            <div> Please Select a Score</div>
        );
    } else {

      if (this.props.currentCIS.bundle) {
        return (
          <SplitPane defaultSize='70%' split='vertical'>
            <div id= 'mainDiv'>
            <Container fluid className='noPadding'>
              <Row style={{ marginleft: 100, marginright: 0 }} className = 'clearfix'>
                  <Col className = 'noPadding'>
                  <div id = 'ScoreViewCategoryArray' className='px-5'>
                      <Vulnerability key={this.cisID} currentCIS={this.props.currentCIS} vulnerability={this.props.currentVuln} callBackToInfoSection ={this.setInfoSection.bind(this)} setProgress={this.props.setProgress} updateInfo = {this.state.infoSectionUpdate} />
                  </div>
                  </Col>
              </Row>
            </Container>
            </div>
            <div className = '_infoSection'> <InfoSection currentCIS={this.props.currentCIS} updateInfo={this.state.infoSectionUpdate} curCat={this.state.curCat} currentVuln={this.props.currentVuln}/> </div>
          </SplitPane>
        );
      } else {
        return (
          <SplitPane defaultSize='70%' split='vertical'>
            <div id= 'mainDiv'>
            <Container fluid className='noPadding'>
              <Row style={{ marginleft: 100, marginright: 0 }} className = 'clearfix'>
                  <Col className = 'noPadding'>
                  <div id = 'ScoreViewCategoryArray' className='px-5'>
                      <CategoryArray key = {this.cisID} currentCIS = {this.props.currentCIS} callBackToInfoSection ={this.setInfoSection.bind(this)} updateInfo = {this.state.infoSectionUpdate} />
                  </div>
                  </Col>
              </Row>
            </Container>
            </div>
            <div className = '_infoSection'> <InfoSection currentCIS={this.props.currentCIS} updateInfo={this.state.infoSectionUpdate}/> </div>
          </SplitPane>
        );
      }
    }
  }
}
export default ScoringView;

class Vulnerability extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      categoryArray: null,
      progress: 0
    }
    this.updateComponent = this.updateComponent.bind(this);

  }

  async componentDidMount() {
    this.updateCategoryArray()
  }

  async componentDidUpdate(prevProps) {
    
    if (this.props.vulnerability !== prevProps.vulnerability ) {
      this.updateCategoryArray()
    }

    if (this.props.currentCIS !== prevProps.currentCIS || this.props.updateInfo !== prevProps.updateInfo) {
      await this.updateComponent();
    }

    
  }

  async updateComponent() {
    let cisID = this.props.currentCIS["@rid"].toString();
    updateJsonRep(cisID)    
  }

  setProgress = (updateProgress) => {
    let totalDefault = this.props.vulnerability.totalDefault
    let totalChosen = this.props.vulnerability.totalChosen

    if (updateProgress.prevSelected) {
      if (updateProgress.prevSelected.default) {
        totalDefault--
      }
    } else {
      if (updateProgress.default) {
        totalDefault++
      }

      totalChosen++
    }

    this.props.setProgress({id: this.props.vulnerability['@rid'], progress: {totalDefault: totalDefault, totalChosen: totalChosen}})
  }

  //forces this component to update, updates jsonRep, propogates up to ScoringView
   setVulnerabilityScore = async (selected) => {
    await this.updateComponent();
    await this.props.callBackToInfoSection(selected);
  }

  updateCategoryArray() {
    if (this.props.vulnerability) {
      let associatedCves = ''
      if (this.props.vulnerability.cve) {
         associatedCves = 'Associated CVEs: '
        for (const cve of this.props.vulnerability.cve) {
          associatedCves += cve + ' '
        }
      }
      

      this.setState({
        categoryArray: (<div></div>)
      }, () => {
        this.setState({
          categoryArray: 
                (<div className='mt-3'>
                  <h3 className='border-bottom'>
                    {this.props.vulnerability.name}
                  </h3>
                  <p className='w-75 mx-auto text-left'>
                    {this.props.vulnerability.description}
                    <br/>
                    {associatedCves}
                    <br/>
                  </p>
                  <CategoryArray currentCIS={this.props.vulnerability} topCIS={this.props.currentCIS} callBackToInfoSection={this.setVulnerabilityScore.bind(this)} setProgress={this.setProgress} updateInfo = {this.state.infoSectionUpdate} />
                </div>)
        }//, () => console.log('Set category array', this.props.vulnerability.name)
        )
      })
    }
  }

  render() {

    // if (this.props.vulnerability) {
    //   console.log('Vulnerability currentVuln: ', this.props.vulnerability.name)
    // }    

    return(
        <Row className='clearfix'>
            <Row>
              <div id='categoryArray' className='mx-auto'>
                {/* <ProgressBar now={this.state.progress}/> */}
                {this.state.categoryArray}
              </div>
            </Row>
          </Row>
    );
  }
}

class CategoryArray extends React.Component {

    constructor(props, context) {
      super(props, context);

      this.state = {
        catArray: [],
        selectedCat: null,
        memoValue: '',
        memoHeight: 1
      };
      this.updateComponent = this.updateComponent.bind(this);
      this.handleClearClick = this.handleClearClick.bind(this);
      this.handleSelect = this.handleSelect.bind(this);
      this.handleBlur = this.handleBlur.bind(this);
      this.handleFocus = this.handleFocus.bind(this);
      this.handleNewChange = this.handleNewChange.bind(this);

    }

    async componentDidMount() {
      
      await this.updateComponent();
      
    }

    async componentDidUpdate(prevProps) {
      if (this.props.currentCIS !== prevProps.currentCIS || this.props.updateInfo !== prevProps.updateInfo) {
        await this.updateComponent();
      }
    }

    async updateComponent() {
      if (this.props.currentCIS) {
        //console.log('<vuln> id: ', this.props.currentCIS.name)
        const cisID = this.props.currentCIS['@rid'].toString();

        //console.log("<update> cisID: " + cisID)
        //console.log("<update> name: ", this.props.currentCIS.name)

        let url = process.env.REACT_APP_DB + "/getCatArray";
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
          this.setState({catArray: response}, () => {
            if (this.state.selectedCat !== null && this.state.selectedCat < this.state.catArray.length) {
              this.setState({memoValue: this.state.catArray[this.state.selectedCat].memo}, () => console.log("Memo: ", this.state.memoValue)); // reset state value
            } else {
              this.setState({memoValue: this.state.catArray[0].memo}, () => console.log("Memo: ", this.state.memoValue)); // reset state value
            }
          });
          
      
        })

        // If there is a topCIS prop (meaning this is a category of 
        // a vulnerability score), use that to update the JsonRep
        if (this.props.topCIS) {
          updateJsonRep(this.props.topCIS['@rid'].toString())
        } else {
          updateJsonRep(cisID)
        }

      }
      
    }

    //forces this component to update, updates jsonRep, propogates up to ScoringView
    setCategoryScore = async (updatedScores) => {
      if (this.props.setProgress) {
        this.props.setProgress({default: updatedScores.default, prevSelected: updatedScores.prevSelected})
      }
      
      await this.updateComponent();
      await this.props.callBackToInfoSection(updatedScores);
    }

    handleClearClick = async (selected) => {
      // TODO: clear the entire sections score
      selected.preventDefault();
    }

    //Sets the category Index to update memofield
    handleSelect = async (selected) => {
      // Only update if it isn't the review tab
      if (selected !== this.state.catArray.length) {
        this.setState({selectedCat: selected})//, () => console.log('Updated state selectedCat: ', this.state.selectedCat));
        if (this.state.catArray[selected]) {
          this.setState({memoValue: this.state.catArray[selected].memo}, () => console.log("Memo: ", this.state.memoValue));      
        }
      }
    }

    //TODO: updateJsonRep to include memo reasoningField
    handleBlur = async (key) => {
   //console.log('Updating memo field on exit', this.state.memoValue);
      try {
        let catToUpdate = 0;

        if (this.state.selectedCat !== null) {
          catToUpdate = this.state.selectedCat;
        }

        let url = process.env.REACT_APP_DB + "/update"
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: this.state.catArray[catToUpdate].categoryID,
            data: { // Make sure memo isn't null/undefined
              memo: this.state.memoValue ? this.state.memoValue : ''
            }
          })
        })
        await this.updateComponent();
      } catch (error) {
       //console.log('Error in handleMemoChange', error);
      }
    }

    // Get the state onFocus and then save onBlur.  Need to auto set focuseed state on start
    handleFocus = async (selected) => {
      // selected.preventDefault();
      try {
        //const cisID = this.props.currentCIS['@rid'].toString();
        let catToUpdate = 0;
        if (this.state.selectedCat !== null) {
          catToUpdate = this.state.selectedCat;
        }
        const memoField = this.state.catArray[catToUpdate].memo;

        if (memoField !== null) {
          this.setState({memoValue: memoField})//, () => console.log('Updated state memoValue: ', this.state.memoValue));
        } else {
         //console.log('memoField is null!', memoField);
        }

      } catch (error) {
       //console.log('there was an error', error);
      }

    }

    // TODO: dynamically adjust memoHeight based on size of text inside box.
    // rows = {Math.round(this.state.memoHeight)/10}

    handleNewChange = async (event) => {
      this.setState({memoValue: event.target.value});
      // this.setState({memoHeight: document.getElementById('memo_field').scrollHeight},//console.log(this.state.memoHeight));
    }

      render() {
        
      return (
        <Tab.Container id='CategoryTabs'
        defaultActiveKey={0}
        onSelect={this.handleSelect}
        onLoad={this.handleSelect}
        className="mx-3"
        >

        <Row className='clearfix'>
          <Row className='clearfix'>
            <Nav className='nav-tabs' stacked = {false}>
            {
              this.state.catArray.map((category, i) => {
                //TODO: change class name from testX to something more readable
                const x = 'test' + i;
                  return (
                    <Nav.Item>
                      <Nav.Link className={x} eventKey= {i} key = {i}>
                        {category.name}
                      </Nav.Link>  
                    </Nav.Item>
                  );
              })
            }
            </Nav>
          </Row>
          <Row className='mx-2 w-100'>
            <Tab.Content className='mx-auto w-100'
              mountOnEnter={true}
              unmountOnExit={true}
              >
              {
              this.state.catArray.map((category, i) => {
                return(
                  <Tab.Pane eventKey={i} key = {i}>
                    <Table>
                      <thead className='charactistics-list-header'>
                        <tr>
                          <td style={{width: 5 + '%', color: 'white'}}></td>
                          <td style={{width: 30 + '%', color: 'white'}} align='left' ><span><strong>Attributes  (Weight)</strong></span></td>
                          <td style={{width: 65 + '%', color: 'white'}} > <strong>Description     |     Score</strong></td>
                        </tr>
                      </thead>
                    </Table>
                    {
                      <CharacteristicsArray currentCIS={this.props.currentCIS} category={category} callBackToCategoryScore={this.setCategoryScore.bind(this)} />
                    }
                    <div className = 'catInfo'>
                        {/* <Form onSubmit={this.handleFormSubmit}> */}
                          <Form>
                            <Form.Control type='text'
                              id='memo_field'
                              placeholder= 'Score Reasoning'
                              value = {this.state.memoValue}
                              onFocus = {this.handleFocus}
                              onChange = {this.handleNewChange}
                              onBlur = {this.handleBlur}
                            />
                            {/*TODO: Need to implement clearSection*/}
                            {/* <button  onClick={(e) => this.handleClearClick(e)}>
                              Clear Section
                            </button> */}
                            {/* <Button type='submit'> Submit </Button> */}
                        </Form>
                        <font size='4'><strong> {category.name} Total: {category.total}</strong></font>

                    </div>
                  </Tab.Pane>
                );
              })
            }

            </Tab.Content>
          </Row>
        </Row>
      </Tab.Container>
      );
    }
  }

  class CharacteristicsArray extends React.Component {

      constructor(props, context) {
        super(props, context);

        this.state = {
          charArray: [],
          score: 0
        };

        this._isMounted = false

        this.updateComponent = this.updateComponent.bind(this);
       //console.log('Finding characteristics for ', this.props.category.name)
      }

      async componentDidMount() {
        this._isMounted = true
        await this.updateComponent();
      }

        async componentDidUpdate(prevProps) {
        if (this.props.currentCIS !== prevProps.currentCIS) {
          await this.updateComponent();
        }
      }

      async componentWillUnmount() {
        this._isMounted = false
      }

      async setState(updater, callback = undefined) {
        if (this._isMounted) {
          super.setState(updater, callback)
        }
      }

      async updateComponent() {

        this.setState({
          charArray: await this.props.category.characteristics
        })

        let chars = this.state.charArray
        let idArray = []
        chars.forEach(c => {
          idArray.push(c.charID)
        })
        
        let url = process.env.REACT_APP_DB + "/getscores "
        fetch(url, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ids: idArray
          })
        }).then(response => response.json())
        .then(response => {
          chars.forEach(characteristic => {
            let key = characteristic.charID
            characteristic.total = response.scores[key]
          })

          this.setState({
            charArray: chars
          })
        })
      }

      //forces this component to update, adds up score, propogates up to Category
       setCharacteristicScore = async (updatedScores) => {
        updatedScores.categoryID = this.props.category.categoryID

       //console.log("<score> characteristic updated scores charac: ", updatedScores)

        await this.updateComponent();
        await this.props.callBackToCategoryScore(updatedScores);
        
      }

        render() {
        return (
          this.state.charArray.map((characteristic, i) => {
           //console.log('<score> characteristic: ', characteristic.name, characteristic.total)
            return(
              <div className = 'characteristics-table-container' key={i}>
                <div className = 'characteristics-table-tableflex'>
                  <Table className='characteristics-list'>
                    <thead className='charactistics-section-list-header'>
                        <tr>
                          <td style={{width: 5 + '%'}}></td>
                          <th style={{width: 30 + '%'}}>{characteristic.name} - ({characteristic.weight})</th>
                          <td style={{width: 65 + '%', border: 'none'}}></td>
                        </tr>
                    </thead>
                    <tbody>
                      <AttributeArray style={{opacity: 1}} currentCIS = {this.props.currentCIS} characteristic = {characteristic} callBackToCharacteristicScore ={this.setCharacteristicScore.bind(this)}/>
                      {/* <tr key =  'test'>
                        <th style={{width: 35 + '%'}}></th>
                        <td style={{width: 65 + '%', border: 'none'}}>
                          Total: {characteristic.total}
                          <br/>
                          Weighted Total: {(characteristic.total * characteristic.weight).toFixed(2)}
                        </td>
                      </tr> */}
                    </tbody>
                  </Table>
                </div>
              </div>
            );
          })
        );
      }
    }

class AttributeArray extends React.Component {

  constructor(props, context) {
    super(props, context);

    this.state = {
      attrArray: [],
      attrScore: 0
    };
    this.updateComponent = this.updateComponent.bind(this);
    }

    async componentDidMount() {
      await this.updateComponent();
    }

    async componentDidUpdate(prevProps) {
      if (this.props.currentCIS !== prevProps.currentCIS) {
        await this.updateComponent();
      }
    }

    async updateComponent() { 
      const characteristic = await this.props.characteristic;

      this.setState({
        attrArray: characteristic.attributes
      })
      
    }

    //This function adds up all attributes per characteristic section and then multiplys by the weight of the section - saving the result.
    setAttributeScore = async (updatedScores) => {
      updatedScores.characteristicId = this.props.characteristic.charID
     //console.log("<score> characteristic updated scores attributes: ", updatedScores)
      await this.props.callBackToCharacteristicScore(updatedScores);
    }

    render() {
      return (
        this.state.attrArray.map((attribute, i) => {
          return(
            <tr key={i} align='left'>
              <td style={{width: 35 + '%', border: 'none'}}>{attribute.name}</td>
              <td style={{width: 65 + '%', border: 'none'}} align='left'><ScoreArray currentCIS={this.props.currentCIS} attribute={attribute} callBackToAttributeScore={this.setAttributeScore.bind(this)} /> </td>
            </tr>
          );
        })
      );
    }
  }

class ScoreArray extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      scoreArray: [],
      selectedOption: null
    };

    this.updateComponent = this.updateComponent.bind(this);
    this.updateScore = this.updateScore.bind(this);
  }

  async componentDidMount() {
    await this.updateComponent();
  }

  async componentDidUpdate(prevProps) {
    if (this.props.currentCIS !== prevProps.currentCIS) {
      await this.updateComponent();
    }
  }

  async updateComponent() {

    let selected = null
    for (var i = 0; i < this.props.attribute.scores.length; i++) {
      if (this.props.attribute.scores[i].chosen) {
        selected = this.props.attribute.scores[i]
      }
    }

    this.setState({
      scoreArray: this.props.attribute.scores,
      selectedOption: selected
    })    
  }

  customStyles = {
    option: (base, state) => ({
      ...base,
      // Wrap text if it's too long
      'MozWhiteSpace': 'pre-wrap',
      'OWhiteSpace': 'pre-wrap',
      'whiteSpace': 'pre-wrap',
      // Hide text if it can't wrap
      'overflow':'hidden',
      'textOverflow':'ellipsis',


      'color': 'black',
      'minHeight': '24px',
    })
  };

  updateScore = async function(selected, prevSelected) {
    let url = process.env.REACT_APP_DB + '/updateScore'

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({
        selected: selected,
        userWeight: this.props.attribute.user_weight,
        attrID: this.props.attribute.attrID,
        vulnID: this.props.currentCIS['@rid'].toString()
      })
    }).then(response => response.json())
    .then(async (response) => {
      //console.log("<score> characteristic updated scores: ", response)
      console.log('Default: ', selected.default)
      response.default = selected.default
      response.prevSelected = prevSelected
      await this.props.callBackToAttributeScore(response)
    })
  };

  handleChange = async (selectedOption) => {
    //console.log('Option Selected', selectedOption);
    let prevSelected = this.state.selectedOption
    this.setState({ selectedOption: selectedOption});
    await this.updateScore(selectedOption, prevSelected);
  }

  render() {
    return(
      <Select
        styles={this.customStyles}
          value = {this.state.selectedOption}
          onChange={this.handleChange}
          options={this.state.scoreArray}
          theme={(theme) => ({
            ...theme,
            borderRadius: 0,
            width: 100,
            colors: {
            ...theme.colors,
              text: 'orangered',
              primary25: 'gray',
              primary: 'yellow'
            },
          })}
          placeholder='Select...'

      />
    );
  }
}