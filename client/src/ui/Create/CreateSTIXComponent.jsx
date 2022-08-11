/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
/*Custom*/
import CreateCIS from './CreateCISSTIX';

/*
  Create tab component handler
*/
class CreateSTIXComponent extends React.Component {

  render() {
    return (

      <div id= 'CreateComponent'>
          <div id= 'CreateView'>
            <h1>Create Score From STIX</h1>
          </div>
          <CreateCIS db={this.props.db} uid={this.props.uid} changeTab={this.props.changeTab} scoreTabKey={this.props.scoreTabKey} setCurrentCIS={this.props.setCurrentCIS}/>
      </div>

    );

  }

}

export default CreateSTIXComponent;