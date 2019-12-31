const { AbstractActionHandler } = require("demux")

const RequestProcessor = require('./requestProcessor');
const ContractInteraction = require('./contractInteraction');

const timeFrameMinutes = 5;


class ObjectActionHandler extends AbstractActionHandler {
	constructor(options, mongo, state) {
		const updaters = [];
		const effects = [
			{
				actionType: options.ala_data.oracle_contract_name + '::addrequest',
				run: async (payload, blockInfo, context) => {``
					console.log("Received addrequest event");
					// console.log(payload.data);
					const request_id = payload.data.request_id;
					const caller = payload.data.caller;
					
					//const apis = payload.data.apis;
					const prefered_api = "";
					// console.log(prefered_api);
					const string_to_count = "";

					const apis = [ 
						{ parameters: '{}',
						response_type: 1,
						json_field: 'USD',
						request_type: 0,
						endpoint:
							'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,CAD' },
							{ parameters: '{}',
							response_type: 1,
							json_field: 'USD',
							request_type: 0,
							endpoint:
								'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,CAD' },
								{ parameters: '{}',
								response_type: 1,
								json_field: 'message',
								request_type: 0,
								endpoint:
									'http://www.mocky.io/v2/5e0b2cdc330000810020a932' },
								{ parameters: '{}',
						response_type: 1,
						json_field: 'USD',
						request_type: 0,
						endpoint:
							'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,CAD' },
							{ parameters: '{}',
						response_type: 1,
						json_field: 'USD',
						request_type: 0,
						endpoint:
							'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,CAD' }
							
					]

					// const apis = [{
					// 	parameters: '{}',
					// 	response_type: 1,
					// 	json_field: 'message',
					// 	request_type: 0,
					// 	endpoint:"http://www.mocky.io/v2/5df0a16a3100008d008f0980"
					// },
					// {
					// 	parameters: '{}',
					// 	response_type: 1,
					// 	json_field: 'message',
					// 	request_type: 0,
					// 	endpoint:"http://www.mocky.io/v2/5df0a16a3100008d008f0980"
					// },
					// {
					// 	parameters: '{}',
					// 	response_type: 1,
					// 	json_field: 'message',
					// 	request_type: 0,
					// 	endpoint:"http://www.mocky.io/v2/5df0bcd531000053008f0a55"
					// },
					// {
					// 	parameters: '{}',
					// 	response_type: 1,
					// 	json_field: 'message',
					// 	request_type: 0,
					// 	endpoint:"http://www.mocky.io/v2/5df0bcd531000053008f0a55"
					// },
					// {
					// 	parameters: '{}',
					// 	response_type: 1,
					// 	json_field: 'message',
					// 	request_type: 0,
					// 	endpoint:"http://www.mocky.io/v2/5df0bcd531000053008f0a55"
					// }]


					// const apis = [{ 	
					// 		parameters: '',
					// 		response_type: 1,
					// 		json_field: 'rates\nINR',
					// 		request_type: 0,
					// 		endpoint:'https://min-api.cryptocompare.com/data/price?fsym=ALA&tsyms=BTC,USD,INR,CAD,ETH' 
					// 	},
					// 	{ 
					// 		parameters: '',
					// 		response_type: 1,
					// 		json_field: 'quotes\nUSDINR',
					// 		request_type: 0,
					// 		endpoint: 'https://min-api.cryptocompare.com/data/price?fsym=ALA&tsyms=BTC,USD,INR,CAD,ETH' 
					// 	},
					// 	{ 
					// 		parameters: '',
					// 		response_type: 1,
					// 		json_field: 'rates\nINR',
					// 		request_type: 0,
					// 		endpoint:'https://api.exchangerate-api.com/v4/latest/USD' 
					// 	}]
						// { 	
						// 	parameters: '{}',
						// 	response_type: 1,
						// 	json_field: 'USD',
						// 	request_type: 0,
						// 	endpoint: 
						// 		'https://google.com:81' 
						// }]

					// const apis = [{ 	
					// 		parameters: '{}',
					// 		response_type: 3,
					// 		json_field: '..country',
					// 		request_type: 0,
					// 		endpoint:'https://5dfb0d3d38678a00145fa83b.mockapi.io/aladinapi/v1/colordata' 
					// 	}]


					// const response_type = payload.data.response_type;					
					// const aggregation_type = payload.data.aggregation_type;
					const aggregation_type = 1 	 // 0,1,3,4,5,8
					const response_type =  2 ; //1,2

					// const response_type =  0; //0
					// const aggregation_type = 2 // 2, 6,7 ,9

					// const response_type =  3; //3
					// const aggregation_type = 6; // 6,7,9,10


					var assigned_oracle = "";
					var standby_oracle = "";
					try {
						const rpc_response = await context.contractInteraction.getRequestById(caller, request_id);
						if (rpc_response.rows.length === 0) {
							console.log('Failed to get request from contract table');
                            return;
						}
						const record = rpc_response.rows[0];
						
					
						// if (options.ala_data.oracle_account != record.assigned_oracle) {
						// 	console.log('Skip request to other oracle');
						assigned_oracle = record.assigned_oracle;
						standby_oracle = record.standby_oracle;
						if (new Date(record.time).valueOf() !== blockInfo.blockInfo.timestamp.valueOf()) {
							console.log('Request time does not match');
							return;
						}
					}
					catch (e) {
						console.log('Failed to retrieve request from table');
						console.error(e);
					}
					var shiftedTime = blockInfo.blockInfo.timestamp; //this is workaround because alaiojs parses time_point in Date object with wrong timezone
					shiftedTime.setMinutes(shiftedTime.getMinutes() - shiftedTime.getTimezoneOffset());
					// Track all requests in mongo to delete them after time is up
					context.mongo.model('pending_request').create({ caller: caller, id: request_id, creation_time: shiftedTime }).catch(error => {
						console.error('Failed to insert request to mongo: ', error);
					});
					// const result = await context.requestProcessor.processRequest(request_id, caller, apis, response_type, aggregation_type);
					console.log("inside objectActionHandler request_id", request_id)
					console.log("inside objectActionHandler caller", caller)
					console.log("inside objectActionHandler apis", apis)
					console.log("inside objectActionHandler aggregation_type", aggregation_type)
					console.log("inside objectActionHandler response_type", response_type)
					console.log("inside objectActionHandler prefered_api", prefered_api)

				
					if (options.ala_data.oracle_account != assigned_oracle && options.ala_data.oracle_account != standby_oracle) {
						console.log('Skip request assigned to other oracle');
						return;
					}
					const result = await context.requestProcessor.processRequest(request_id, caller, apis, response_type, aggregation_type,context, prefered_api, string_to_count, options, assigned_oracle, standby_oracle);
					if (options.ala_data.oracle_account == assigned_oracle) {
						context.contractInteraction.reply(caller, request_id, result).catch(error => {
							console.error('Failed to send `reply` action', error);
							context.mongo.model('request_response').create({
								caller: caller,
								id: request_id,
								creation_time: shiftedTime,
								target_time: shiftedTime,
								response: result
							}).catch(error => {
								console.error('Failed to insert response to mongo: ', error);
							});
						});
					}
					else if (options.ala_data.oracle_account == standby_oracle) {
						var targetDate = new Date(shiftedTime);
						targetDate.setMinutes(targetDate.getMinutes() + timeFrameMinutes);
						context.mongo.model('request_response').create({
							caller: caller,
							id: request_id,
							creation_time: shiftedTime,
							target_time: targetDate,
							response: result
						}).catch(error => {
							console.error('Failed to insert response to mongo: ', error);
						});
					}
				},
			},
			{
				actionType: options.ala_data.oracle_contract_name + '::reply',
				run: async (payload, blockInfo, context) => {
					const request_id = payload.data.request_id;
                    const caller = payload.data.caller;
                    context.mongo.model('pending_request').deleteOne({ caller: caller, id: request_id }).catch(console.log);
				}
			}
		];
		const handlerVersion = {
			versionName: 'v1',
			updaters,
			effects,
		};
		super([handlerVersion]);
		this.options = options;
		this.mongo = mongo;
		this.state = state;
		this.requestProcessor = new RequestProcessor(options);
		this.contractInteraction = new ContractInteraction(options);
		this.running = true;
	}

	async setup() {

	}

	async handleWithState(handle) {
		await handle(this.state, this);

		const { blockNumber } = this.state.indexState;
		const stateCopy = JSON.parse(JSON.stringify(this.state));
		const last_block = this.mongo.model('last_block');
		return last_block.findOneAndUpdate({}, { $set: stateCopy }, {}).then( result => {
			if (!result) {
				console.log('Inserting initial record');
				return last_block.create(stateCopy);
			}
		});
	}

	async loadIndexState() {
		return this.state.indexState;
	}

	async rollbackTo(blockNumber) {
		this.state.indexState.blockNumber = blockNumber;
		this.state.indexState.blockHash = '';
	}

	async updateIndexState(stateObj, block, isReplay, handlerVersionName) {
		stateObj.indexState.blockNumber = block.blockInfo.blockNumber;
		stateObj.indexState.blockHash = block.blockInfo.blockHash;
		stateObj.indexState.isReplay = isReplay;
		stateObj.indexState.handlerVersionName = handlerVersionName;
		if (stateObj.indexState.blockNumber % 100 === 0) {
			console.log('Current block number: ', stateObj.indexState.blockNumber);
		}
	}


	async resendResponses() {
		const request_response = this.mongo.model('request_response');
		try {
			var now = new Date();
			const responses = await request_response.find({ "target_time": {$lte: now} }).exec();
			for (var i = 0; i < responses.length; i++) {
				const record = responses[i];
				const rpc_response = await this.contractInteraction.getRequestById(record.caller, record.id);
				if (rpc_response.rows.length === 0) {
					await request_response.deleteOne({ caller: record.caller, id: record.id }).exec();
				}
				else {
					var d = new Date(rpc_response.rows[0].time);
					d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); //this is workaround because alaiojs parses time_point in Date object with wrong timezone
					if (d.valueOf() === record.creation_time.valueOf()) {
						try {
							await this.contractInteraction.reply(record.caller, record.id, (record.response) ? record.response : "");
							await request_response.deleteOne({ caller: record.caller, id: record.id }).exec();
						} catch (e) {
							console.error('Failed to send `reply` action: ', e);
						};
					}
					else {
						await request_response.deleteOne({ caller: record.caller, id: record.id }).exec();
					}
				}

			}
		} catch(e) {
			console.error(e);
		}

		if (this.running) {
			this.resendResponsesTimer = setTimeout(async () => await this.resendResponses(), 20000);
		}
	}

	async sendTimedOut() {
		const pending_request = this.mongo.model('pending_request');
		var date = new Date();
		date.setMinutes(date.getMinutes() - timeFrameMinutes * 2);
		try {
			const requests = await pending_request.find({ "creation_time": {$lte: date} }).exec();
			for (var i = 0; i < requests.length; i++) {
				const record = requests[i];
				const rpc_response = await this.contractInteraction.getRequestById(record.caller, record.id);
				if (rpc_response.rows.length === 0) {
					await pending_request.deleteOne({ caller: record.caller, id: record.id }).exec();
				}
				else {
					var d = new Date(rpc_response.rows[0].time);
					d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); //this is workaround because alaiojs parses time_point in Date object with wrong timezone
					if (d.valueOf() === record.creation_time.valueOf()) {
						try {
							await this.contractInteraction.reply(record.caller, record.id, "");
						} catch (e) {
							console.error('Failed to send `reply` action: ', e);
						};
					}
					await pending_request.deleteOne({ caller: record.caller, id: record.id }).exec();
				}

			}
		} catch(e) {
			console.error(e);
		}

		if (this.running) {
			this.sendTimedOutTimer = setTimeout(async () => await this.sendTimedOut(), 20000);
		}
	}

	stop() {
		this.running = false;
		clearTimeout(this.resendResponsesTimer);
		clearTimeout(this.sendTimedOutTimer);
	}
}

module.exports = ObjectActionHandler;
