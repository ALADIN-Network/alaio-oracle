# Nodejs oracle application

## Prerequisites

In order for this application to work you need to run ALA node that has the MongoDB plugin activated.  
Check out [MongoActionReader](https://github.com/ALADIN-Network/demux-js-ala#mongoactionreader) section of demux-js-ala github to get information on Mongo requirements for demux.

### How to run

Install all required packages

```
$ npm install
```

Create default.json in config/ directory

```
$ mkdir config
$ cd config
```

Create file default.json with the following structure:

```json
{
  "private_key": "{PRIVATE_ACTIVE_KEY}",
  "ala_data": {
      "endpoint": "http://jungle2.cryptolions.io:80",
      "oracle_contract_name": "oracle",
      "oracle_account": "<account, which is running this app>"
  },
  "mongo": {
      "historyDBName": "ALA",
      "applicationDBName": "oracle",
      "endpoint": "<your mongo endpoint>"
  }
}
```

Config description:
- ala_data->'endpoint' - ALA rpc api endpoint
- 'oracle_contract_name' - account that has oracle contract deployed on
- 'oracle_account' - oracle account which is running the app and will sign 'reply' actions to oracle contract
- 'historyDBName' - name of mongo databse created by mongodb plugin
- 'applicationDBName' - name of mongo databse which will be used for storing application data
- mongo->'endpoint' - address of mongo which is used for storing oracle contract actions

Export private key for oracle contract
```
$ export PRIVATE_ACTIVE_KEY=<oracle active private key>
```

Run application by executing
```
$ npm start
```
In case you want application to start processing blocks from current head block (instead of last block processed by application) then you should launch it using
```
$ npm start -- --skip-missed
```