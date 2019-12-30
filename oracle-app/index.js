/*
 * Entry point
 */

const { AbstractActionHandler, BaseActionWatcher, MismatchedBlockHashError } = require("demux")
const { MongoActionReader } = require("demux-ala")
const mongoose = require('mongoose');
const createLastBlockModel = require('./models/last_block.model');
const createRequestResponseModel = require('./models/request_response.model');
const createAuditTrailModel = require('./models/audit_trail.model');
const createPendingRequestModel = require('./models/pending_request.model');
const config = require('./config/default.json');
const yargs = require('yargs');

const ObjectActionHandler = require('./objectActionHandler');

const initialState = {
	indexState: {
		blockNumber: 0,
		blockHash: '',
		isReplay: false,
		handlerVersionName: 'v1',
	},
};


function checkWatcher(watcher, onStop) {
	if (watcher.running) {
		setTimeout(() => checkWatcher(watcher, onStop), 10000);
	}
	else {
		console.log('Watcher stopped');
		onStop(watcher.error);
	}
}

async function run(mongoose, skip_missed) {
	const last_block = mongoose.model('last_block');
	try {
		var record = await last_block.findOne({}).lean().exec();
	}
	catch (e) {
		console.error(e);
	}
	const state = (!record || skip_missed) ? initialState : record;
	console.log(state);

	const actionReader = new MongoActionReader({
		startAtBlock: state.indexState.blockNumber,              // startAtBlock: the first block relevant to our application
		onlyIrreversible: false,         // onlyIrreversible: whether or not to only process irreversible blocks
		dbName: config.mongo.historyDBName,                   // name of the database
		mongoEndpoint: config.mongo.endpoint,    // mongoEndpoint: the url of the mongodb instance
	});
	const actionHandler = new ObjectActionHandler(config, mongoose, state)
	actionHandler.resendResponses();
	actionHandler.sendTimedOut();
	const actionWatcher = new BaseActionWatcher(actionReader, actionHandler, 250);
	try {
		await actionReader.initialize();
		actionWatcher.watch();
		checkWatcher(actionWatcher, (error) => {
			actionHandler.stop();
			console.log('Restarting application');
			if (error instanceof MismatchedBlockHashError) {
				console.log('Skipping mismatched blocks');
				run(mongoose, true);
			}
			else {
				run(mongoose, false);
			}
		});
	}
	catch (e) {
		console.error(e);
	}
}


const argv = yargs
    .option('skip-missed', {
        description: 'Start processing blocks from blockchain head',
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .argv;


const skip_missed = argv['skip-missed'];
if (skip_missed) {
	console.log('Start reading blocks from current head');
}


if (!config.hasOwnProperty('private_key') || typeof config.private_key !== 'string' || config.private_key === '') {
	console.log('Configuration file doesn`t have `private_key` key or it is invalid.');
	process.exit(0);
}
if (!config.hasOwnProperty('ala_data')) {
	console.log('Configuration file doesn`t have `ala_data` key or it is invalid.');
	process.exit(0);
}
if (!config.ala_data.hasOwnProperty('oracle_contract_name') || typeof config.ala_data.oracle_contract_name !== 'string' || config.ala_data.oracle_contract_name === '') {
	console.log('Configuration file doesn`t have `oracle_contract_name` key or it is invalid.');
	process.exit(0);
}
if (!config.ala_data.hasOwnProperty('oracle_account') || typeof config.ala_data.oracle_account !== 'string' || config.ala_data.oracle_account === '') {
	console.log('Configuration file doesn`t have `oracle_account` key or it is invalid.');
	process.exit(0);
}

mongoose.connect(config.mongo.endpoint + '/' + config.mongo.applicationDBName,
	{ useCreateIndex: true, useNewUrlParser: true, useFindAndModify: false }).catch( err => {
    console.error(err);
    process.exit(1);
});

// mongoose.set('debug',true);
createLastBlockModel(mongoose);
createRequestResponseModel(mongoose);
createAuditTrailModel(mongoose);
createPendingRequestModel(mongoose);

run(mongoose, skip_missed).catch(console.error);

