/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import { Accordion, Card } from 'react-bootstrap';
/*Custom*/
import CreateCIS from './CreateCIS';
import CreateCISSTIX  from './CreateCISSTIX';


/*
  Create tab component handler
*/
class CreateComponent extends React.Component {

  render() {

    return (
      
      <div id= 'CreateComponent'>
        <Accordion style={{width : "70%", margin : "auto"}} defaultActiveKey="0">
          <Card border="light" style={{"background-color" : "rgba(0,0,0,0)"}}>
            <Accordion.Toggle as={Card.Header} eventKey="0">
              <h2>Create Score From STIX</h2>
            </Accordion.Toggle>

            <Accordion.Collapse eventKey="0">
                <Card.Body><CreateCISSTIX db={this.props.db} uid={this.props.uid} changeTab={this.props.changeTab} scoreTabKey={this.props.scoreTabKey} setCurrentCIS={this.props.setCurrentCIS}/></Card.Body>
            </Accordion.Collapse>
          </Card>
          <Card border="light" style={{"background-color" : "rgba(0,0,0,0)"}}>
            <Accordion.Toggle as={Card.Header} eventKey="1">
              <h2>Create Score From Scratch</h2>
            </Accordion.Toggle>

            <Accordion.Collapse eventKey="1">
                <Card.Body><CreateCIS db={this.props.db} uid={this.props.uid} changeTab={this.props.changeTab} scoreTabKey={this.props.scoreTabKey} setCurrentCIS={this.props.setCurrentCIS}/></Card.Body>
            </Accordion.Collapse>
          </Card>
        </Accordion>
      </div>
      
     
    );

  }

}

export default CreateComponent;
