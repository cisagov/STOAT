/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
// import * as SplitPane from 'react-split-pane';
import SplitPane from 'react-split-pane'
/*Custom*/
//import InfoSection from '../InfoSection';
import ScoringList from './ScoringList';
import ScoringView from './ScoringView';

/*Style*/
const divStyle = {
  height: '95%',
};

/*
  Scoring tab component handler
*/
class ScoringComponent extends React.Component {
  constructor(props, context) {
      super(props, context);

      this.state = {
        selectedItem: null,
        selectedID: 'empty',
        selectedVuln: null
      };

  }

  setCurrentVuln = (selected) => {
    console.log('Setting selected vuln')
    this.setState({
      selectedVuln: selected
    }, () => console.log(this.state.selectedVuln?.name))
  }

  setProgress = (progress) => {
    this.setState({
      updateProgress: progress
    })
  }
  
  render() {
    return (
      <SplitPane className = 'scorePane' defaultSize='20%' split='vertical' style={divStyle} >
        <div>
            <ScoringList uid={this.props.uid} setCurrentCIS={this.props.setCurrentCIS} setCurrentVuln={this.setCurrentVuln} currentVuln={this.state.selectedVuln} currentCIS={this.props.currentCIS} updateProgress={this.state.updateProgress}/>
        </div>
        <div>
              {/* <SplitPane overflow = 'auto' defaultSize='85%' split='horizontal'> */}
                <div className ='ScoringView'><ScoringView setCurrentCIS={this.props.setCurrentCIS} setProgress={this.setProgress} currentVuln={this.state.selectedVuln} currentCIS={this.props.currentCIS}/></div>
              {/* </SplitPane> */}

        </div>
      </SplitPane>
    );
  }
}
export default ScoringComponent;
