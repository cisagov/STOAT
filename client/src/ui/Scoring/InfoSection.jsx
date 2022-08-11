/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import { Table, Badge, Button, ProgressBar } from 'react-bootstrap';
import { VictoryPie, VictoryTooltip } from 'victory';
import { Chart, Bar, defaults } from 'react-chartjs-2'
import ExportCIS from '../Create/ExportCIS';
/*Custom*/
//import handleClearClick from './Scoring/ScoringView';
import { parseStixBundle } from './ScoringFuncs'

/*
  Manages InfoSection which is the pane to the right of the Scoring tab
  Included here is the piegraph, name/config/ticket # and graphics for Category Scores and Category Scores x Applicability
  TODO: Move this to score & track state there. Otherwise, make a call to the criteria set to populate description lists
*/
export default class InfoSection extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      catArray: [],
      configuration: null
    };
    this.updateComponent = this.updateComponent.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.getCatAppScore = this.getCatAppScore.bind(this);
    this.getCatScore = this.getCatScore.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

  }

  async componentDidMount() {
    this.updateComponent();
  }

  async componentDidUpdate(prevProps) {
   //console.log('<vuln> info curentObj: ', this.props.currentVuln)
    if (this.props.updateInfo !== prevProps.updateInfo || this.props.currentCIS !== prevProps.currentCIS || this.props.currentVuln !== prevProps.currentVuln) {
      this.updateComponent();
      
    }
  }

  async updateComponent() {
    //console.log('Infosection update', this.props.currentVuln)

    let id = null

    if (this.props.currentCIS.bundle) {
      if (this.props.currentVuln) {
        id = this.props.currentVuln['@rid'].toString()
      }
      
    } else {
      id = this.props.currentCIS['@rid'].toString()
    }
    const configuration = this.props.currentCIS['configuration'];


    if (id) {
      let url = process.env.REACT_APP_DB + "/configuration"

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({id: configuration})
      }).then(response => response.json())
      .then(response => {
        this.setState({
          configuration: response
        })
      //console.log('<info> config: ' + JSON.stringify(this.state.configuration))
      })

      url = process.env.REACT_APP_DB + "/getCatArray";
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cisID: id
        })
      })
      .then(response => response.json())
      .then(response => {
      //console.log("<info> response: " + JSON.stringify(response))
        this.setState({
          catArray: response
        })
      })

      if (this.props.currentVuln) {
        url = process.env.REACT_APP_DB + '/select'
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: this.props.currentVuln['@rid']
          })
        })
        .then(response => response.json())
        .then(response => {
          this.setState({
            currentVuln: response
          })
        })
      }
    }
  }

  getInfoGraph = () => {

    switch (this.props.currentCIS.profile) {
      case 'vulnerability':
        // CVE/CWE profile
        return this.getCveCweChart()
      case 'attack':
        // Attack surface profile
        return this.getDefaultChart()
      case 'structure':
        // Structure profile
        return this.getDefaultChart()
      default:
        return this.getDefaultChart()
    }
  }

  getDefaultDataSet = () => {
    try {
      let select = [] 
      if (this.state.catArray === null) {
        console.log(this.props.currentCIS)
        console.log(this.props.currentCIS.jsonRep)
        console.log('Error, we are null, make sure this.props.select is passed in...');
        select = '';
      } else {
          this.state.catArray.forEach(category => {
            if (category.name !== 'Applicability' && category.total !== 0) {
                const retLabel = category.name + ' | ' + category.total;
                select.push({y: category.total, x: category.total, label: retLabel});
            }
          });
        return select;
      }
    } catch (error) {
     console.log('getDataSet in InfoSection', error);
    }
  }

  getDefaultChart = () => {
    let dataSet = this.getDefaultDataSet()

    return (<VictoryPie
      style={{ labels: { fill: 'black', fontSize: 10, fontWeight: 'bold' } }}
      cornerRadius={25}
      labelRadius={10}
      //colorScale={['#eb7777', '#ffc97f', '#72A5D8', '#D6D872', '#A5D872', '#c9e7db' ]}
      colorScale={['#CC6677', '#DDCC77', '#88CCEE', '#44AA99', '#117733', '#332288', '#AA4499', '#882255']}
      labelComponent={
        <VictoryTooltip angle={-35}/>
      }
      data={dataSet}
      x='x'
      y='y'
    />)
  }

  getCveCweChart = () => {
    if (this.state.currentVuln) {
      let score = this.state.currentVuln.total_score
      console.log('testScore: ', score)

      // let url = process.env.REACT_APP_DB + '/getCatArray'
      // return await fetch(url, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     cisID: this.props.currentVuln['@rid'].toString()
      //   })
      // }).then(response => response.json())
      // .then(response => {
        
        

        if (this.props.currentVuln['@class'] === 'Vulnerability') {
          return (
            
            <Bar className='mx-5'
            height={200}
              
              data={
                {labels: ['CVSS Score'], 
                datasets: [{label: "CVSS Score",
                            backgroundColor: '#ed3434',
                            borderColor: '#ed3434',
                            borderWidth: 1,
                            hoverBackgroundColor: '#ed3434',
                            hoverBorderColor: '#ed3434',
                            barThickness: 30,
                            data: [score]
                          }]
                        }}
              options={{
                legend: {
                  labels: {
                    fontColor: '#ffffff'
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    gridLines: {
                      color: '#131c2b'
                    },
                    min: 0,
                    max: 10,
                    ticks: {
                      beginAtZero: true,
                      count: 10,
                      stepSize: 1,
                      precision: 0
                    }
                  }
                }
              }}
            />
          )
        } else if (this.props.currentVuln['@class'] === 'Weakness') {

          let temporalScore = this.state.currentVuln.temporal_score
          let attackSurfaceScore = temporalScore * this.state.currentVuln.attack_surface_score
          let environmentalScore = temporalScore * this.state.currentVuln.environmental_score

          return (
            <Bar className='mx-5'
            height={200}
              
              data={
                {labels: ['Temporal', 'Temporal * Attack Surface', 'Temporal * Environmental', 'Final Score'], 
                datasets: [
                  {label: "",
                    backgroundColor: ['#cf8dfb', '#ff8484', '#ffcc5c', '#5cecc6'],
                    borderWidth: 1,
                    data: [temporalScore, attackSurfaceScore, environmentalScore, score]
                  }]
                        }}
              options={{
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    min: 0,
                    max: 100,
                    ticks: {
                      beginAtZero: true,
                      count: 10,
                      stepSize: 10,
                      precision: 0,
                      color: 'white'
                    }
                  },
                  x: {
                    ticks: {
                      color: 'white'
                    }
                  }
                }
              }}

            />
          )
        } else {
          return null
        }
      // })
    } else {
      return null
    }
  }

  handleSubmit = async (event) => {

    event.preventDefault();
   //console.log(this.props.currentCIS);

    let url = process.env.REACT_APP_DB + '/update'
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: this.props.currentCIS['@rid'],
        data: {
          status: 'finished'
        }
      })
    })
  }

 getCatScore = () => {
    try {
      const chartCats = [];
     //console.log("catArray check: " + JSON.stringify(this.state.catArray))
      this.state.catArray.forEach(category => {
          if (category.name !== 'Applicability') {
            chartCats.push({name: category.name, score: category.total.toFixed(2)});
          }
      });
      return chartCats;
    } catch (error) {
     //console.log('getCatScore in InfoSection', error);
    }
  }

  getCatAppScore = () => {
      try {
        let chartCatsApp = [];
        let applicabilityNum = 1;
        //find applicability num
        this.state.catArray.forEach(category => {
            if (category.name === 'Applicability') {
              applicabilityNum = category.total;
            }
        });
        this.state.catArray.forEach(category => {
          if (category.name !== 'Applicability') {
            chartCatsApp.push({name: category.name, score: (category.total * applicabilityNum).toFixed(2)});
          }
        });

        return chartCatsApp;
      } catch (error) {
       //console.log('getCatAppScore in InfoSection', error);
      }
  }

  getConfig = (configuration) => {
    try {
      let con = null;
     //console.log('<info> config check: ' + JSON.stringify(this.state.configuration))
      if (configuration !== this.state.configuration['@rid'].toString()) {
       //console.log('configuration rids dont match');
        con = this.state.configuration['name'];

      } else {
        con = this.state.configuration['name'];
      }
      return con;
    } catch (error) {
     //console.log('getConfig in InfoSection', error);
    }
  }

  testParse = () => {
    parseStixBundle(JSON.parse(this.props.currentCIS.bundle))
  }

  render() {

    // const cisID = this.props.currentCIS['@rid'].toString();
    // const criteriaSet = this.props.currentCIS['criteriaSet'];
    const configuration = this.props.currentCIS['configuration'];
    const ourConfig = this.getConfig(configuration);
    //const dataSet = this.getDataSet();
    const infoGraph = this.getInfoGraph();
    const CatScores = this.getCatScore();
    const CatAppScores = this.getCatAppScore();

   //console.log(CatScores)

    let catList = []
    if (CatScores) {
      catList = CatScores.map((cat, cIndex) => {
        return  <tr key={cIndex}>
                    <td >{cat.name}</td>
                    <td >{cat.score}</td>
                </tr>;

      });
    }
    

    let catAppList = []
    if (CatAppScores) {
      catAppList = CatAppScores.map((cat, cIndex) => {
        return  <tr key={cIndex}>
                    <td >{cat.name}</td>
                    <td >{cat.score}</td>
                </tr>;
      });
    }
    

    return (

      <div id='InfoSection'>

        <h2>{this.props.currentCIS.name}</h2>

        {/* <div id = 'info'>
          <span>
          <p>
            Configuration: <Badge>{ourConfig}</Badge>
          </p>
          </span>
        </div> */}
        <div>

          {infoGraph}         

          <Button onClick={() => {
            let url = process.env.REACT_APP_DB + '/exportSTIX';
            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                id: this.props.currentCIS['@rid'].toString()
              })
            }).then(response => response.json()).then(response => {
              let element = document.createElement("a")
              let file = new Blob([JSON.stringify(response)], {type: 'text/plain'})
              element.href = URL.createObjectURL(file);
              element.download = 'bundle--' + this.props.currentCIS.name + '.json'
              document.body.appendChild(element)
              element.click();
            })
          }}>Export STIX</Button>

          <div id='info-user-view'>
              <h4>Category Scores</h4>
              <Table className='info-user-list'>
                  <thead>
                      <tr>
                          <th>Category</th>
                          <th>Score</th>
                      </tr>
                  </thead>
                  <tbody>
                    {catList}
                  </tbody>
              </Table>
              {/* <h4>Category Scores x Applicability</h4>
              <Table className='info-user-list'>
                  <thead>
                      <tr>
                          <th>Category</th>
                          <th>Score</th>
                      </tr>
                  </thead>
                  <tbody>
                    {catAppList}
                  </tbody>
              </Table> */}
          </div>
        </div>

        {/* <form onSubmit={this.handleSubmit}>
            <button onClick={(e) => this.handleSubmit(e)}>
                Submit CIS
            </button>
        </form>

        <ExportCIS cis={this.props.currentCIS}/> */}

      </div>

    );
  }

}
