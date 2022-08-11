/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
/*Custom*/
import {ListGroup, ListGroupItem} from 'react-bootstrap';

/*
  Handles the list when moving to 'Finished'
  TODO: Make sure state is set when mounting (ala. fix the issue when scoring an object and never 'selecting' the CIS you are scoring showing blank on report view)
  TODO: rename to ReportView
*/
class FinishList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            cisList: [],
            cisFinishList: [],
            selectedName: ''
        };
    }

    componentDidMount() {
        const self = this;
        let url = process.env.REACT_APP_DB + '/cis'
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
        .then(queryR => {
                if (queryR) {
                    self.setState({
                        cisList: queryR
                    });
                    if (self.props.currentCIS) {
                        self.setState({
                            selectedName: self.props.currentCIS.name
                        });
                        const tempCisList = [];
                        for (const cis of queryR) {
                            if (cis.name !== self.props.currentCIS.name && cis.profile === self.props.currentCIS.profile) {
                                tempCisList.push({label: cis.name, value: cis.name, cisObject: JSON.parse(cis.jsonRep)});
                            }
                        }
                        self.props.createCompareList(tempCisList);
                        self.props.createChartData(self.props.currentCIS);
                    }
                } else {
                    console.log('Error. No CIS array found in FinishList');
                }
            }
          );
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentCIS !== prevProps.currentCIS) {
            this.updateComponent()
        }
    }

    updateComponent = () => {

        let tempCisList = []

        this.state.cisList.forEach(cis => {
            if (cis.name !== this.props.currentCIS.name && cis.profile === this.props.currentCIS.profile) {
                tempCisList.push({label: cis.name, value: cis.name, cisObject: JSON.parse(cis.jsonRep)});
            }
        });

        this.props.createCompareList(tempCisList)
    }

    handleClick = async (selected) => {
        this.setState({ selectedName: selected.name });
        const tempCisList = [];
        await this.props.setCurrentCIS(selected);
        this.state.cisList.forEach(cis => {
            if (cis.name !== this.props.currentCIS.name && cis.profile === this.props.currentCIS.profile) {
                tempCisList.push({label: cis.name, value: cis.name, cisObject: JSON.parse(cis.jsonRep)});
            }
        });

        this.props.createCompareList(tempCisList);
        this.props.createChartData(this.props.currentCIS);
    }

    render() {

        const lgiStyle = {
            textAlign: 'center',
            fontSize: '1.2em',
            color: 'black'
        };

        const wTotalScores = []
        let index = 0
        this.state.cisList.forEach(cisObj => {
            let totalScore = 0;
            let applicability = 0;
            if (cisObj.jsonRep) {
                // for (const cat of JSON.parse(cisObj.jsonRep).criteriaDefault) {
                //     if (cat.category === 'Applicability') {
                //         applicability = parseFloat(cat.total_score);
                //     }
                // }
                // for (const cat of JSON.parse(cisObj.jsonRep).criteriaDefault) {
                //     if (cat.category !== 'Applicability') {
                //         totalScore += (cat.total_score * applicability);
                //     }
                // }
                // cisObj.total_score = totalScore.toFixed(2);
                wTotalScores.push(cisObj);
            } else {
                console.error("ERROR: undefined jsonRep --> ", JSON.stringify(cisObj))
            }

            index++
        });

        wTotalScores.sort(function(a, b) {
            return b.total_score - a.total_score;
        });

        const progressList = [];

        //const finishList = this.state.cisList.map((cisObj, index) => {
        const finishList = [];

        index = 0;

        wTotalScores.forEach(cisObj => {
            // Skip undefined/null values
            if (cisObj) {
                if (cisObj.status === 'progress') {
                    if (this.state.selectedName === cisObj.name) {
                        // console.log('we ARE active', this.state.selectedName);
                          progressList.push(
                              <ListGroupItem style={lgiStyle} key={index} onClick={ () => this.handleClick(cisObj)} active>{cisObj.name}</ListGroupItem>
                          );
                      } else {
                        // console.log('we ARENT active', this.state.selectedName);
                          progressList.push(
                              <ListGroupItem style={lgiStyle} key={index} onClick={ () => this.handleClick(cisObj)}>{cisObj.name}</ListGroupItem>
                          );
                      }
                } else if (cisObj.status === 'finished') {
                    if (this.state.selectedName === cisObj.name) {
                        finishList.push(
                            <ListGroupItem style={lgiStyle} key={index} onClick={ () => this.handleClick(cisObj)} active>{cisObj.name}</ListGroupItem>
                        );
                    } else {
                        finishList.push(
                            <ListGroupItem style={lgiStyle} key={index} onClick={ () => this.handleClick(cisObj)}>{cisObj.name}</ListGroupItem>
                        );
                    }
                
                }
            }

            index++;
        })

        return (
            <div id='FinishList'>
                <div className='CisList'>
                    <h5>Sorted: Total x Applicability</h5>
                    <h4 className='border-bottom mt-2'>Finished Score</h4>
                    <ListGroup>
                        {finishList}
                    </ListGroup>
                    <h4 className='border-bottom mt-2'>In Progress Score</h4>
                    <ListGroup>
                        {progressList}
                    </ListGroup>
                </div>
            </div>
        );
    }
}

export default FinishList;
