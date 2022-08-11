/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import { Tab, Nav, Table } from 'react-bootstrap';
import {Bar} from 'react-chartjs-2';
import Select from 'react-select';

/*Style*/
//const backgroundColor = ['#ffc97f', '#72A5D8', '#D6D872', '#A5D872', '#c9e7db'];

class FinishView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
          chartData: {dataSets: [], dataSetsApp: [], categories: [], categoriesApp: [], labels: []},
          datas: { labels: [], datasets: []}
        };
    }

    async componentDidMount() {
          if (this.props.currentCIS) {
            await this.updateComponent();
          }
    }

    async componentDidUpdate(prevProps) {
      if (this.props.currentCIS !== prevProps.currentCIS) {
        await this.updateComponent();
      }
    }

    async updateComponent() {
      // console.log('trying to update chart data');
      await this.props.createChartData(this.props.currentCIS);
      this.setState({chartData: this.props.chartData});
    }

    handleChange = async (selectedOption) => {
      const tempJsonList = [];
      for (const cisOption of selectedOption) {
          tempJsonList.push(cisOption);
      }
      this.props.createSelectedList(tempJsonList);
    }

    handleSelect = async (eventKey, event) => {
      // console.log('yesssssssssssssss');
      await this.updateComponent();
    }

    customStyles = {
      option: (base, state) => ({
        ...base,
        'color': 'black',
        'height': '34px',
        'minHeight': '24px',
      })
    };

    renderIndividualTab = () => {

        let options = {
            //responsive: false,
            //maintainAspectRatio: false,
            legend: {
                labels: {
                    fontColor: '#ffffff'
                }
            },
            scales: {
                xAxes: [{
                    stacked: true,
                    gridLines: {
                        color: '#131c2b'
                    },
                    ticks: {
                        fontColor: '#ffffff'
                    }
                }],
                yAxes: [{
                    stacked: true,
                    gridLines: {
                        color: '#131c2b'
                    },
                    ticks: {
                        fontColor: '#ffffff'
                    }
                }]
            }
        }

        let vulnOptions = options
        let weakOptions = options

        vulnOptions.scales.yAxes[0].max = 10
        weakOptions.scales.yAxes[0].max = 100
        

        if (this.props.currentCIS?.profile === 'vulnerability') {
            console.log(this.props.chartData)
            let vulnData = {
                labels: this.props.chartData.labels.vulnerabilities,
                datasets: this.props.chartData.dataSets.vulnerabilities?.map((dataset) => dataset)
            }
            let weakData = {
                labels: this.props.chartData.labels.weaknesses,
                datasets: this.props.chartData.dataSets.weaknesses?.map((dataset) => dataset)
            }

            return (<>
            {/* Uncomment this to show vuln data after it's time to implement CVE scoring */}
            {/* <Bar data={vulnData} options={vulnOptions}/> */}
            <Bar data={weakData} options={weakOptions}/></>)
        } else {
            const dataSets = {
                labels: this.props.chartData.labels,
                datasets: []
            };
            dataSets.datasets = this.props.chartData.dataSets.map((dataset) => dataset);

            <Bar data={dataSets} options={options}/>

        }
    }

    render() {

        const tdStyle = {
            verticalAlign: 'middle'
        };

        // const dataSets = {
        //     labels: this.props.chartData.labels,
        //     datasets: []
        // };
        // dataSets.datasets = this.props.chartData.dataSets.map((dataset, index) => {
        //     return(dataset);
        // });
        // const dataSets = {
        //     labels: this.state.chartData.labels,
        //     datasets: this.state.chartData.dataSets
        // };

        const dataSetsApp = {
            labels: this.props.chartData.labels,
            datasets: []
        };
        

        const compareChartData = this.props.compareChartData

        // console.log('in InfoSection finishView dataSets', dataSets);
        dataSetsApp.datasets = this.props.chartData.dataSetsApp.map((dataset, index) => {
            return(dataset);
        });

        const catList = this.state.chartData.categories.map((cat, cIndex) => {
            return  <tr key={cIndex}>
                        <td style={tdStyle}>{cat.name}</td>
                        <td style={tdStyle}>{cat.score}</td>
                    </tr>;
        });

        const catListApp = this.props.chartData.categoriesApp.map((cat, cIndex) => {
            return  <tr key={cIndex}>
                        <td style={tdStyle}>{cat.name}</td>
                        <td style={tdStyle}>{cat.score}</td>
                    </tr>;
        });

        if (!this.props.currentCIS) {
            return (
              <div> Please Select a Score</div>
            );
        } else {
            return (
                <div>
                    <Tab.Container id='reportView-tabs' defaultActiveKey={0}>
                        <div>
                            <Nav className='nav-tabs' onSelect={(k) => this.handleSelect(k)}>
                                <Nav.Item><Nav.Link eventKey={0}>Individual View</Nav.Link></Nav.Item>
                                <Nav.Item><Nav.Link eventKey={1}>Comparison View</Nav.Link></Nav.Item>
                            </Nav>
                            <Tab.Content animation>
                                <Tab.Pane eventKey={0}>
                                    <div id='individual-view'>
                                        {/* <h3>Individual Info</h3> */}
                                        {/* <h4>Category Scores</h4>
                                        <Table style={{backgroundColor: '#080c12'}} className='user-list'>
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
                                        <h4>Category Scores x Applicability</h4>
                                        <Table style={{backgroundColor: '#080c12'}} className='user-list'>
                                            <thead>
                                                <tr>
                                                    <th>Category</th>
                                                    <th>Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catListApp}
                                            </tbody>
                                        </Table> */}

                                        {this.renderIndividualTab()}

                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey={1}>
                                    {console.log('compareList: ', this.props.compareList)}
                                    {console.log('selectedList: ', this.props.selectedList)}
                                    <div id='comparison-view'>
                                      <Select
                                        isMulti
                                        styles={this.customStyles}
                                        value={this.props.selectedList}
                                        onChange={this.handleChange}
                                        name='comparison'
                                        options={this.props.compareList}
                                        className='our_comparison'
                                        classNamePrefix='select'
                                      />
                                        {/* <h3>Comparison View</h3> */}
                                        <div id='chart-container'>
                                          <h4>Category Scores</h4>
                                           <div className='report-chart'>
                                              <Bar
                                                data={compareChartData}
                                                //data={this.state.chartData}
                                                //width={1000}

                                                //height={600}
                                                options={{
                                                  //responsive: false,
                                                  //maintainAspectRatio: false,
                                                  legend: {
                                                      labels: {
                                                          fontColor: '#ffffff'
                                                      }
                                                  },
                                                  scales: {
                                                      xAxes: [{
                                                          stacked: true,
                                                          gridLines: {
                                                              color: '#131c2b'
                                                          },
                                                          ticks: {
                                                              fontColor: '#ffffff'
                                                          }
                                                      }],
                                                      yAxes: [{
                                                          stacked: true,
                                                          gridLines: {
                                                              color: '#131c2b'
                                                          },
                                                          ticks: {
                                                              fontColor: '#ffffff'
                                                          }
                                                      }]
                                                  }
                                                }} />
                                          </div>
                                          {/* <br /> <br />
                                            <h4>Category Scores x Applicability</h4>
                                            <div className='report-chart'>
                                                <Bar
                                                  data={dataSetsApp}
                                                  //width={100}
                                                  //height={50}
                                                  options={{
                                                    //maintainAspectRatio: false,
                                                    legend: {
                                                        labels: {
                                                            fontColor: '#ffffff'
                                                        }
                                                    },
                                                    scales: {
                                                        xAxes: [{
                                                            stacked: true,
                                                            gridLines: {
                                                                color: '#131c2b'
                                                            },
                                                            ticks: {
                                                                fontColor: '#ffffff'
                                                            }
                                                        }],
                                                        yAxes: [{
                                                            stacked: true,
                                                            gridLines: {
                                                                color: '#131c2b'
                                                            },
                                                            ticks: {
                                                                fontColor: '#ffffff'
                                                            }
                                                        }]
                                                    }
                                                  }} />
                                            </div> */}
                                        </div>
                                    </div>
                                </Tab.Pane>
                            </Tab.Content>
                        </div>
                    </Tab.Container>
                </div>
            );
        }
    }
}

export default FinishView;
