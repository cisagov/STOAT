import * as React from 'react';
import { Button } from 'react-bootstrap';

class ExportCIS extends React.Component {
    
    downloadCIS = () => {
        let element = document.createElement("a")
        let data = JSON.stringify(this.props.cis)
        console.log(data)
        let file = new Blob([data], {type: 'text/plain'})
        element.href = URL.createObjectURL(file);
        element.download = 'blob-' + this.props.cis.name + '.json'
        document.body.appendChild(element)
        element.click();
    }

    render() {
        return(
            <div>
                <Button onClick={this.downloadCIS}>Export JSON</Button>
            </div>
        )
    }
}

export default ExportCIS;