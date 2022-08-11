/*
Copyright 2020 Southern California Edison Company

ALL RIGHTS RESERVED
*/

/*Libraries*/
import * as React from 'react';

/*Handles the admin dropdown list*/
export default class UserPortal extends React.Component {

    render() {
        return (
            <div id='btn-userportal'>
                <span><strong>{this.props.db}</strong></span>
                {/* <span className='down-arrow'><strong>&#x25BE;</strong></span>
                <div className='dropdown-content'>
                    <ul>
                        <li onClick={this.props.uportal}>Criteria Set Editor</li>
                        <li onClick={this.props.uportal}>Configuration Editor</li>
                    </ul>
                </div> */}
            </div>
        );
    }
}
