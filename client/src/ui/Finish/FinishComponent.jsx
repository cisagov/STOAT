/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import SplitPane from 'react-split-pane'
/*Custom*/
import FinishList from './FinishList';
import FinishView from './FinishView';
/*Style*/
const divStyle = {
  height: '95%',
};

const backgroundColors = ['#CC6677', '#DDCC77', '#88CCEE', '#44AA99', '#117733', '#332288', '#AA4499', '#882255'];
//const backgroundColors = ['#ffc97f', '#72A5D8', '#D6D872', '#A5D872', '#c9e7db'];
//const backgroundColors = ['rgba(255,201,127,0.9)', 'rgba(114,165,216,0.9)', 'rgba(214,216,114,0.9)', 'rgba(165,216,113,0.9)', 'rgba(201,231,219,0.9)'];
const borderColors = ['#CC6677', '#DDCC77', '#88CCEE', '#44AA99', '#117733', '#332288', '#AA4499', '#882255'];
//const borderColors = ['#ffc98b', '#72A5Da', '#D6D87f', '#A5D873', '#c9e7df'];
//const borderColors = ['rgba(255,201,139,0.9)', 'rgba(114,165,218,0.9)', 'rgba(214,216,127,0.9)', 'rgba(165,216,114,0.9)', 'rgba(201,231,223,0.9)'];
const bColorSize = 8;

/*
  Report tab component handler
*/
class FinishComponent extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            chartData: {dataSets: [], dataSetsApp: [], categories: [], categoriesApp: [], labels: []},
            comparisonCisSelected: [],
            compareList : []
        };

        this.createChartData = this.createChartData.bind(this);
        this.createSelectedList = this.createSelectedList.bind(this);
        this.createCompareList = this.createCompareList.bind(this);
    }
    async componentDidMount() {
      this.createChartData(this.props.currentCIS);
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentCIS !== prevProps.currentCIS && this.props.currentCIS && prevProps.currentCIS) {
            if (this.props.currentCIS.profile !== prevProps.currentCIS.profile) {
                this.createSelectedList([])
            }
        }
    }

    createCompareList = (cisList) => {
        this.setState({
            compareList: cisList
        });
    }

    createSelectedList = async (cisJsonList) => {
            await this.setState({
                comparisonCisSelected: cisJsonList
            });
            this.createCompareChartData();
    }

    populateInitialDataSet = async (currentCisJsonRepObj) => {
      let tempChartData = [];
      let tempChartDataApplicability = [];
      let chartDataObject = {};
      let chartCats = [];
      let catLabels = [];
      let chartCatsApp = [];
      let applicabilityNum = 1;

      console.log('<reports> jsonRep', currentCisJsonRepObj)
      //console.log('<reports> has vulnerability: ', currentCisJsonRepObj.criteriaDefault.some(c => c.vulnerability))

      // Check which profile is being used
      let profile = this.props.currentCIS?.profile
      console.log('<reports> profile', profile)

      if (profile === 'vulnerability') {
          // CWE/CVE profile
            tempChartData.vulnerabilities = []
            tempChartData.weaknesses = []
            catLabels.vulnerabilities = []
            catLabels.weaknesses = []

          // Create dataset for vulnerabilities
          let total = 0
          tempChartData.vulnerabilities.push({label: "CVSS Score",
            backgroundColor: backgroundColors[1],
            borderColor: borderColors[1],
            borderWidth: 1,
            hoverBackgroundColor: backgroundColors[1],
            hoverBorderColor: borderColors[1],
            data: []})

          for (const vuln of currentCisJsonRepObj.criteriaDefault.vulnerabilities) {
            catLabels.vulnerabilities.push(vuln.vulnerability)
            tempChartData.vulnerabilities[0].data.push(vuln.total_score)

            total += vuln.total_score

            // for (const [cIndex, catObj] of vuln.categories.entries()) {
            //     let index = tempChartData.vulnerabilities.findIndex(d => {
            //         return d.label === catObj.category
            //     })
            //     if (index !== -1) {
            //         tempChartData.vulnerabilities[index].data.push(catObj.total_score.toFixed(2))
            //     } else {
                    // tempChartData.vulnerabilities.push({label: catObj.category,
                    //                     backgroundColor: backgroundColors[cIndex % bColorSize],
                    //                     borderColor: borderColors[cIndex % bColorSize],
                    //                     borderWidth: 1,
                    //                     hoverBackgroundColor: backgroundColors[cIndex % bColorSize],
                    //                     hoverBorderColor: borderColors[cIndex % bColorSize],
                    //                     data: [catObj.total_score.toFixed(2)]})
            //     }
            //     totals[cIndex] = totals[cIndex] ? totals[cIndex] + catObj.total_score : catObj.total_score
            // }
          }

          console.log('total: ', total)
          let numVulns = currentCisJsonRepObj.criteriaDefault.vulnerabilities.length
          // Add average values
          
          // Add average label
          tempChartData.vulnerabilities[0].data.unshift((total / numVulns).toFixed(2))
          catLabels.vulnerabilities.unshift('Average')

          // Create dataset for weaknesses
          total = 0
          tempChartData.weaknesses.push({label: "Score",
            backgroundColor: backgroundColors[0],
            borderColor: borderColors[0],
            borderWidth: 1,
            hoverBackgroundColor: backgroundColors[0],
            hoverBorderColor: borderColors[0],
            data: []})
          for (const weakness of currentCisJsonRepObj.criteriaDefault.weaknesses) {
            catLabels.weaknesses.push(weakness.weakness)

            console.log("<reports> weakness", weakness)

            tempChartData.weaknesses[0].data.push(weakness.total_score)

            total += weakness.total_score

            // for (const [cIndex, catObj] of weakness.categories.entries()) {
            //     let index = tempChartData.weaknesses.findIndex(d => {
            //         return d.label === catObj.category
            //     })
            //     if (index !== -1) {
            //         tempChartData.weaknesses[index].data.push(catObj.total_score.toFixed(2))
            //     } else {
                    // tempChartData.weaknesses.push({label: catObj.category,
                    //                     backgroundColor: backgroundColors[cIndex % bColorSize],
                    //                     borderColor: borderColors[cIndex % bColorSize],
                    //                     borderWidth: 1,
                    //                     hoverBackgroundColor: backgroundColors[cIndex % bColorSize],
                    //                     hoverBorderColor: borderColors[cIndex % bColorSize],
                    //                     data: [catObj.total_score.toFixed(2)]})
            //     }
            //     totals[cIndex] = totals[cIndex] ? totals[cIndex] + catObj.total_score : catObj.total_score
            // }
          }

          console.log('total: ', total)
          let numWeaknesses = currentCisJsonRepObj.criteriaDefault.weaknesses.length
          // Add average values
          tempChartData.weaknesses[0].data.unshift((total / numWeaknesses).toFixed(2))
          // Add average label
          catLabels.weaknesses.unshift('Average')
          
      } else {
        catLabels.push(currentCisJsonRepObj.name)
        for (const [cIndex, catObj] of currentCisJsonRepObj.criteriaDefault.entries()) {
            if (catObj.category !== 'Applicability') {
                tempChartData.push({label: catObj.category,
                                    backgroundColor: backgroundColors[(cIndex - 1) % bColorSize],
                                    borderColor: borderColors[(cIndex - 1) % bColorSize],
                                    borderWidth: 1,
                                    hoverBackgroundColor: backgroundColors[(cIndex - 1) % bColorSize],
                                    hoverBorderColor: borderColors[(cIndex - 1) % bColorSize],
                                    data: [catObj.total_score.toFixed(2)]});
                chartCats.push({name: catObj.category, score: catObj.total_score.toFixed(2)});
            } else {
                applicabilityNum = catObj.total_score;
            }
        }
        //Create chart x Applicability
        for (const [cIndex, catObj] of currentCisJsonRepObj.criteriaDefault.entries()) {
            if (catObj.category !== 'Applicability') {
                tempChartDataApplicability.push({label: catObj.category,
                                    backgroundColor: backgroundColors[(cIndex - 1) % bColorSize],
                                    borderColor: borderColors[(cIndex - 1) % bColorSize],
                                    borderWidth: 1,
                                    hoverBackgroundColor: backgroundColors[(cIndex - 1) % bColorSize],
                                    hoverBorderColor: borderColors[(cIndex - 1) % bColorSize],
                                    data: [(catObj.total_score * applicabilityNum).toFixed(2)]});
                chartCatsApp.push({name: catObj.category, score: (catObj.total_score * applicabilityNum).toFixed(2)});
            }
        }
      }

        chartDataObject.dataSets = tempChartData;
        chartDataObject.dataSetsApp = tempChartDataApplicability;
        chartDataObject.categories = chartCats;
        chartDataObject.categoriesApp = chartCatsApp;
        chartDataObject.labels = catLabels;

      return chartDataObject;
    }

    appendToInitialDataSet = async (cisJson, chartDataObject) => {
        let applicabilityNum = 1;
        chartDataObject.labels.push(cisJson.name);
        if (cisJson.criteriaDefault.some(c => c.vulnerability)) {

        } else {
            for (const [cIndex, catObj] of cisJson.criteriaDefault.entries()) {
                if (catObj.category !== 'Applicability') {
                    chartDataObject.dataSets[cIndex - 1].data.push(catObj.total_score.toFixed(2));
                } else {
                    applicabilityNum = catObj.total_score;
                }
            }
            //Create chart x Applicability
            for (const [cIndex, catObj] of cisJson.criteriaDefault.entries()) {
                if (catObj.category !== 'Applicability') {
                    chartDataObject.dataSetsApp[cIndex - 1].data.push((catObj.total_score * applicabilityNum).toFixed(2));
                }
            }
        }
        
        return chartDataObject;
    }

    createChartData = async (currentCIS) => {
        let currentCisJsonRepObj = '';
        if(currentCIS !== null){
            console.log('<reports> currentCIS', currentCIS)
            console.log('<reports> jsonRep', currentCIS.jsonRep)
            if (currentCIS.jsonRep) {
                currentCisJsonRepObj = JSON.parse(currentCIS.jsonRep);
                let chartDataObject = await this.populateInitialDataSet(currentCisJsonRepObj);

                this.setState({
                        chartData: chartDataObject
                });
            } else {
                console.log('Error: jsonRep is undefined')

                let url = process.env.REACT_APP_DB + '/select'
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }, 
                    body: {
                        id: currentCIS['@rid'].toString(),
                        data: "'jsonRep'"
                    }
                }).then(response => response.json())
                .then(response => {
                    console.log('<reports> queried jsonRep: ', response)
                })
            }
        }
    }

    createCompareChartData = async () => {
        const chartLabels = []
        const tempChartData = []

        let cisList = [this.props.currentCIS]

        this.state.comparisonCisSelected.forEach(cisObj => {
            cisList.push(cisObj.cisObject)
        })
        

        for (const cis of cisList) {
            chartLabels.push(cis.name)
            console.log('CIS: ', cis)

            console.log(cis.jsonRep)
            console.log(cis.criteriaDefault)
            // If the CIS is missing the criteriaDefault property, create it from the jsonRep property
            if (!cis.criteriaDefault) {
                let jsonRep = JSON.parse(cis.jsonRep)
                cis.criteriaDefault = jsonRep.criteriaDefault

                console.log(cis.criteriaDefault)
            }
            
            if (cis.criteriaDefault.some(c => c.vulnerability)) {
                let totals = []
                let numVulns = cis.criteriaDefault.length
                for (const vuln of cis.criteriaDefault) {
                    for (const [cIndex, catObj] of vuln.categories.entries()) {
                        totals[catObj.category] = totals[catObj.category] ? totals[catObj.category] + catObj.total_score : catObj.total_score

                        // Check if the category has been added already. If not, add it.
                        if (!tempChartData.some(d => d.label === catObj.category)) {
                            tempChartData.push({label: catObj.category,
                                backgroundColor: backgroundColors[cIndex % bColorSize],
                                borderColor: borderColors[cIndex % bColorSize],
                                borderWidth: 1,
                                hoverBackgroundColor: backgroundColors[cIndex % bColorSize],
                                hoverBorderColor: borderColors[cIndex % bColorSize],
                                data: []})
                        }
                        

                    }
                }
                tempChartData.forEach(chartData => {
                    chartData.data.push((totals[chartData.label] / numVulns).toFixed(2))
                })
            }
            
            
        }

        let compareChartData = {
            labels: chartLabels,
            datasets: tempChartData
        }

        console.log(compareChartData)

        this.setState({
            compareChartData: compareChartData
        })
    }

    render() {
        return (
            <SplitPane defaultSize='15%' split='vertical'  style={divStyle}>
                <div id='FinishList'>
                    <FinishList db={this.props.db} currentCIS={this.props.currentCIS} setCurrentCIS={this.props.setCurrentCIS} createChartData={this.createChartData} createCompareList = {this.createCompareList}/>
                </div>
                <div id='FinishView'>
                    <FinishView  db={this.props.db} currentCIS={this.props.currentCIS} setCurrentCIS={this.props.setCurrentCIS} createCompareChartData={this.createCompareChartData} compareChartData={this.state.compareChartData} createChartData={this.createChartData} chartData={this.state.chartData} createCompareList={this.createCompareList} compareList={this.state.compareList} createSelectedList={this.createSelectedList} selectedList={this.state.comparisonCisSelected}/>
                </div>
            </SplitPane>
        );
    }
}

export default FinishComponent;
