/*
 * This module is used for performing requests and sending responses to oracle contract
 */

const fetch = require('node-fetch');

const ResponseTypes = require('./responseType');
const encode = require('./encoding');
const aggregate = require ('./aggregate')
var moment = require('moment')
var responseJson = require('./response.json')
var aggregationJson = require('./aggregation.json')
/*
 * Checks if value has expected type and return it
 * Otherwise return null
 */
function checkType(value, response_type) {
	console.log("request processor, inside checkType value : ", value, " typeof value :", typeof value )
	// console.log("request processor, inside getResult res:", res)
	// console.log("response_type", response_type)
	if (response_type == ResponseTypes.Bool) {
		// if (typeof value === 'boolean') {
			// return value;
			console.log("boolean")
			return value;
		// }
	}
	else if (response_type == ResponseTypes.Int) {
		if (typeof value === 'number'  &&
			value >= -2147483648 && value <= 2147483647) {
			value = Number.parseInt(value);
			console.log("int-------------", value)
			return value;

		}
	}
	else if (response_type == ResponseTypes.Double) {
		if (typeof value === 'number') {
			console.log("value is parsed to float--------")
			value = Number.parseFloat(value);
			return value;
		}
	}
	else if (response_type == ResponseTypes.String) {
		if (typeof value === 'string' && value.length <= 127) {
			console.log("string")
			return value;
		}
	}
	else return null;

}

/*
 * Parse value from json using path
 * path is string of json fields separated with '\n' required to obtain value from json
 * Ex:
 * {
 *  	"foo": { "bar": 1 }
 * }
 * To parse value 1 from given json response client must provide following path: "foo\nbar"
 */
function getValueFromJson(json, path) {
	const pathArr = path.split('\n');
	console.log("fetched json is: ".json);
	console.log("json path is: ",path);
	var value = json;
	for (var i = 0; i < pathArr.length; i++) {
		value = value[pathArr[i]];
		if (value === undefined) {
			return null;
		}
	}
	return value;
}


class RequestProcessor {

	constructor(options) {
		this.numRetries = 2;
	}

	/*
	 * Makes aggregation of array 'arr' depending on the 'aggregation_type' value
	 */
	// aggregate(arr, aggregation_type) {
	// 	//TODO: make aggregation depending on the aggregation_type
	// 	return arr[0];
	// }

	/*
     * Executes requests to provided apis and returns an aggregation of results
     * In case request url is localhost (or 127.0.0.1)
     * or error was encountered during request processing api will be considered as failed
     */

	async audit_trail (id, caller, api, response_type, aggregation_type, result, aggregated_response, context,  options, assigned_oracle, standby_oracle){

		// console.log("moment().format('YYYY-MM-DD hh:mm:ss')",moment().format('YYYY-MM-DD hh:mm:ss'))
		console.log("request processor, inside audit_trail  :", options.ala_data.oracle_account)
		console.log("request processor, inside audit_trail  :", assigned_oracle)
		console.log("request processor, inside audit_trail  :", (options.ala_data.oracle_contract_name == assigned_oracle))
		console.log("request processor, inside audit_trail  response_type:", response_type, "typeof response_type", typeof response_type)
		console.log("request processor, inside audit_trail  aggregation_type:",aggregation_type,  "typeof aggregation_type", typeof aggregation_type)
		console.log("request processor, inside audit_trail  response_type JSON:", responseJson)
		console.log("request processor, inside audit_trail  aggregation_type JSON:", aggregationJson)
		// console.log("request processor, inside audit_trail  aggregation_type JSON:", aggregationJson)
		// response_type = "" + response_type; 


		response_type = "" + response_type; 
		aggregation_type = "" + aggregation_type; 


		console.log("request processor, inside audit_trail  response_type:", response_type, "typeof response_type", typeof response_type)
		console.log("request processor, inside audit_trail  aggregation_type:",aggregation_type,  "typeof aggregation_type", typeof aggregation_type)
		response_type = responseJson[response_type]; 
		// aggregation_type = "" + aggregation_type; 
		aggregation_type = aggregationJson[aggregation_type]; 
		console.log("request processor, inside audit_trail  aggregation_type :", aggregation_type)
		console.log("request processor, inside audit_trail  response_type :", response_type)

		if (options.ala_data.oracle_account == assigned_oracle){
			var data = {
				caller: caller, 
				request_id: id, 
				time: moment().format('YYYY-MM-DD hh:mm:ss'),
				api_set : {
					api : api.endpoint,
					request_type : api.request_type,
					json_field : api.json_field,							
					parameter : api.parameter,
					response : result
				},
				response_type : response_type,
				aggregation_type : aggregation_type,
				oracle_account : assigned_oracle, 
				standby_oracle_account: standby_oracle,
				aggregated_response: aggregated_response
			}
			// console.log("datadatdatadtadta",data)
			
			console.log("request processor, inside audit_trail api",api)

			if(result){
				var update_api_set = {
					api : api.endpoint,
					request_type : api.request_type,
					json_field : api.json_field,							
					parameter : api.parameter,
					response : result
				}
			}
		
			
		
		
			context.mongo.model('audit_trail').findOne({request_id: id}).then(function (userDataa) {
				// console.log("userDatauserData", userDataa)
				console.log("request processor, inside audit_trail  checking if model is created:",  userDataa == null)
				console.log("request processor, inside audit_trail  checking if model is created:",  userDataa )

				if(userDataa == null && result){
					// console.log("inside if audit_trail......")
					// console.log("data is insane", data)
					console.log("request processor, inside audit_trail if-------------")

					context.mongo.model('audit_trail').create({ 
						caller: caller, 
						request_id: id, 
						time: moment().format('YYYY-MM-DD hh:mm:ss'),
						api_set : {
							api : api.endpoint,
							request_type : api.request_type,
							json_field : api.json_field,							
							parameter : api.parameter,
							response : result
						},
						response_type : response_type,
						aggregation_type : aggregation_type,
						oracle_account : assigned_oracle, 
						standby_oracle_account : standby_oracle,
						aggregated_response: aggregated_response
					
					}).catch(error => {
						console.error('Failed to insert response to mongo3: ', error);
					});
				}
				else if(userDataa == null && !result){
					console.log("request processor, inside audit_trail elseif-------------")

					context.mongo.model('audit_trail').create({ 
						caller: caller, 
						request_id: id, 
						time: moment().format('YYYY-MM-DD hh:mm:ss'),
						// api_set : {
						// 	api : api.endpoint,
						// 	request_type : api.request_type,
						// 	json_field : api.json_field,							
						// 	parameter : api.parameter,
						// 	response : result
						// },
						response_type : response_type,
						aggregation_type : aggregation_type,
						oracle_account : assigned_oracle, 
						standby_oracle_account : standby_oracle,
						aggregated_response: aggregated_response
					
					}).catch(error => {
						console.error('Failed to insert response to mongo3: ', error);
					});
				}
				else if ( (userDataa.api_set || !userDataa.api_set) && result){
					// console.log("inside else audit_trail......")

					console.log("request processor, inside audit_trail elseif2-------------")

					context.mongo.model('audit_trail').update({request_id: id}, {$push: {api_set: update_api_set}}).catch(error => {
						console.error('Failed to insert response to mongo2: ', error);
					});
				}
				else if (userDataa.api_set && !result){
					console.log("request processor, inside audit_trail elseif33333-------------")

					// console.log("inside else audit_trail......")
					context.mongo.model('audit_trail').update({request_id: id}, {$set: {aggregated_response: aggregated_response}}).catch(error => {
						console.error('Failed to insert response to mongo2: ', error);
					});
				}
			})
		}
		
	}
	async processRequest(id, caller, apis, response_type, aggregation_type, context, prefered_api, string_to_count, options, assigned_oracle) {

		
		var results = [];
		for (var api of apis) {
			// console.log(api);
			var result = null;
			if (api.endpoint.match(/^(https:\/\/)?(localhost|127\.0\.0\.1)/) === null) {
				try {
					result = await this.getResult(api, api.endpoint, api.json_field, response_type);
					console.log("request processor, inside processReq result :", result)
					var responsee = await this.audit_trail(id, caller, api, response_type, aggregation_type, result, "", context,  options, assigned_oracle );
					if (result !== null) {
						// console.log("before pushing into results, result : ",result);
						results.push(result);
					}
						
				}
				catch (e) {
					console.error(e);
				}
			}
			else {
				console.log('Skipping request to localhost.');
			}
		}
		var confirmed_response = results.filter((value,index,arr)=>{
			return value!=undefined
		})
		// var undefined_or_null = 0;
		// for(var r in results)
		// {
		// 	if(results[r]===null || results[r]===undefined)
		// 	{
		// 		undefined_or_null++;
		// 	}
		// }
		//console.log("undefined_or_null: ",undefined_or_null);

		
		//prefered_api=undefined
		
		console.log("request processor, inside processReq confirmed_response.length :", confirmed_response.length)
		console.log("request processor, inside processReq apis.length/2  :", apis.length/2)
		console.log("request processor, inside processReq confirmed_response.length>=apis.length/2  :", (confirmed_response.length>=apis.length/2) )
		console.log("request processor, inside processReq results[prefered_api] :", results[prefered_api])



		if(confirmed_response.length>=apis.length/2 && !prefered_api)
		{
			result = aggregate (confirmed_response, aggregation_type, string_to_count)
		}
		else if(prefered_api)
		{
			console.log("prefered_api: ~~~~~~~~~~",prefered_api);
			if(results[prefered_api])
			{
				result = results[prefered_api];
			}
			else
			{
				result = aggregate (confirmed_response, aggregation_type, string_to_count)
			}
		}
		else
		{
			result = aggregate (confirmed_response, aggregation_type, string_to_count)
		}
		// console.log("result: ",result);
		//result = aggregate (results, aggregation_type)

		// if (options.ala_data.oracle_account == assigned_oracle){
		// 	console.log("request processor, inside processReq inside if for the aggregated response  :", result)

		// 	// context.mongo.model('audit_trail').update({request_id: id}, {$set: {aggregated_response: result}}).then(function (userDataa) {
		// 	// 	console.error('Added aggregation response to audit trail', userDataa);
		// 	// });
		// 	result = result.toString()
		// 	context.mongo.model('audit_trail').update({request_id: id}, {$set: {aggregated_response: result}}).catch(error => {
		// 		console.error('Failed to insert response to mongo2222: ', error);
		// 	});
		// }

		// async audit_trail (id, caller, api, response_type, aggregation_type, result, aggregated_response, context,  options, assigned_oracle, standby_oracle){

		var responsee = await this.audit_trail(id, caller, api, response_type, aggregation_type, "", result, context,  options, assigned_oracle );

		var encoded = "";
		try {
			console.log("request processor, inside processReq before encodeing aggregation  :", result)
			encoded = encode(result, response_type);
		}
		catch (e) {
			console.error(e);
		}
	
		console.log("request processor, inside processReq encoded :", encoded)
		return encoded;
	}

	/*
     * Executes request and returns value of valid type
     * If error occurred returns null
     */
	async getResult(set, endpoint, json_field, response_type) {
		
		//if(set.request_type===0){
			var res = await this.makeRequest(endpoint, json_field);
		//}
		// else{
		// 	var res = await this.makePostRequest(set, set.parameters);	
		// }
		console.log("request processor, inside getResult res:", res)
		return checkType(res, response_type);
	}

	/*
     * Executes request (on fail <numRetries> retries is done)
     * and returns value parsed from json
     */
	async makeRequest(endpoint, json_field) {
		var res = null;
		try {
			res = await fetch(endpoint);
		}
		catch (e) {
			console.error(e);
		}
		var retries = this.numRetries;
		// console.log ("num of retries ...", retries)
		while ((!res || !res.ok) && retries > 0) {
			console.log("\nRetrying request...");
			try {
				res = await fetch(endpoint);
			}
			catch (e) {
				console.error(e);
			}
			retries -= 1;
		}
		if (!res || !res.ok) {
			return null;
		}

		const json = await res.json();
		// console.log("json in makerequest : ", json);
		return getValueFromJson(json, json_field);
	}


	async makePostRequest(item, parameters) {

		const options = {
			url: item.api_endpoint,
			method: 'POST',
			headers: {
			  'Accept': 'application/json',
			  'content-type' : 'application/raw',
			  'User-Agent': 'aladin-oracle'
			},
			timeout: 250,
			json: parameters
		};

		await request(options, (err, res, body) => {  
			// console.log("ressssssssssssssss", res)
			if (res && res.statusCode == 200) {
				body = JSON.parse(body);
			  	console.log("body after", typeof body)
				return getValueFromJson(json, json_field);		

			}
			else {
			   return null
			}
		})
	}

}


module.exports = RequestProcessor;