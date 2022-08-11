/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';
import stoat from './../../assets/STOAT-Figure-Lrg.png';

class ScoringSelection extends React.Component {

  render() {
    return (
        <div className="Login">
          <img src={stoat} alt='STOAT logo'/>
          <h2 className="menu-item">Score from Scratch</h2>
          <p>Scoring a STIX 2.1 Bundle</p>
          <h2 className="menu-item">Score STIX Bundle</h2>
          <p>Scoring an exploit, malware, or vulnerability</p>
        </div>
    );
  }
}
export default ScoringSelection;
