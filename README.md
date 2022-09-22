![STOAT masthead](https://d520git.inl.gov/quasar/vme/-/raw/caleb-work/stoat-react/client/public/stoat.png)

The Scoring Threat Objects Analysis Tool (STOAT) web application takes software described in the STIX 2.1 format and automates an initial socre based on the software's weaknesses. 
Then, customers can edit the weakness score to best reflect their environment, notes, and considerations before its out as STIX 2.1.

## To run for the first time:

Make sure to set up OrientDB before starting STOAT. STOAT has been tested with OrientDB 3.0.32. 

Use the command `npm run setup` to set the environment variables and install all the dependencies.

Then type `npm start` to start the application.

React should open the app in the browser automatically. If it doesn't, navigate to [http://localhost:3000](http://localhost:3000).

You should only need to run `npm run setup` once, unless you need to change the environment variables. If you want to install/update dependencies without setting up environment variables, use `npm run update`. If you want to set up environment variables without installing dependencies, either edit the .env files directly (as explained below) or run `./setup.sh`.

## Environment Variables

Both the api and the client use environment variables stored in a .env file. The setup script `npm run setup` will set these up automatically. Here is a reference to what variables are used and what they mean.

#### `./client/.env`

| Name | Default Value | Description
| ------ | ------ | ------ |
| `REACT_APP_DB` | `http://localhost:3001` | API server URL |

#### `./.env`

| Name | Default Value | Description
| ------ | ------ | ------ |
| `ORIENT_HOST` | `localhost` | OrientDB server hostname or IP address |
| `ORIENT_PORT` | `2424` | OrientDB server port |
| `ORIENT_USER` | `root` | OrientDB username |
| `ORIENT_PASS` | `OrientPW` | OrientDB password |
| `DB_NAME` | `stoat` | Database name |
| `DB_USER` | `root` | Database username |
| `DB_PASS` | `OrientPW` | Database password |
| `PORT` | `3001` | API server port |
