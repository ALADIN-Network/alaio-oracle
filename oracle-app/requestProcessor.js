/*
 * This module is used for performing requests and sending responses to oracle contract
 */

const fetch = require('node-fetch');
var async = require("async");
var jp = require('jsonpath');

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

	console.log("inside getValueFromJson, json", json)
	console.log("inside getValueFromJson, path", path)
	var needed_field = jp.query(json, '$.' + path)
	console.log("inside getvaluefromjson, needed_field", needed_field);
	console.log("inside getvaluefromjson needed_field[0]", needed_field[0]);
	return needed_field[0];

	// const pathArr = path.split('\n');
	// console.log("fetched json is: ".json);
	// console.log("json path is: ",path);
	// var value = json;
	// for (var i = 0; i < pathArr.length; i++) {
	// 	value = value[pathArr[i]];
	// 	if (value === undefined) {
	// 		return null;
	// 	}
	// }
	// return value;

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

	async audit_trail (id, caller, api, response_type, aggregation_type,  aggregated_response, context,  options, assigned_oracle){

		console.log("request processor, inside audit_trail  :", options.ala_data.oracle_account)
		console.log("request processor, inside audit_trail  :", assigned_oracle)
		console.log("request processor, inside audit_trail  :", (options.ala_data.oracle_contract_name == assigned_oracle))


		response_type = "" + response_type; 
		aggregation_type = "" + aggregation_type; 

		response_type = responseJson[response_type]; 
		aggregation_type = aggregationJson[aggregation_type]; 

		if (options.ala_data.oracle_account == assigned_oracle){

			context.mongo.model('audit_trail').create({ 
				caller: caller, 
				request_id: id, 
				time: moment().format('YYYY-MM-DD hh:mm:ss'),
				api_set : api,
				response_type : response_type,
				aggregation_type : aggregation_type,
				oracle_account : assigned_oracle, 
				aggregated_response: aggregated_response
			
			}).catch(error => {
				console.error('Failed to insert response to mongo3: ', error);
			});

		}
		
	}
	async processRequest(id, caller, apis, response_type, aggregation_type, context, prefered_api, string_to_count, options, assigned_oracle) {

		
		var results = [];
		var api_response_set = [];
		for (var api of apis) {
			// console.log(api);
			var result = null;
			if (api.endpoint.match(/^(https:\/\/)?(localhost|127\.0\.0\.1)/) === null) {
				try {
					result = await this.getResult(api, api.endpoint, api.json_field, response_type);
					console.log("request processor, inside processReq result :", result)
					
					if (result !== null) {
						api["response"] = result;
						api["api"] = api['endpoint'];
						delete api['endpoint'];
						api_response_set.push(api);
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
		
		var encoded = "";
		try {
			console.log("request processor, inside processReq before encodeing aggregation  :", result)
			encoded = encode(result, response_type);
		}
		catch (e) {
			console.error(e);
		}
	
		console.log("request processor, inside processReq encoded :", encoded)
		console.log("apaiaapapiapiaiapaipapapia", api_response_set)
		console.log("apaiaapapiapiaiapaipapapia", result)

		await this.audit_trail(id, caller, api_response_set, response_type, aggregation_type, result, context,  options, assigned_oracle );


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


	// async makePostRequest(item, parameters) {

	// 	const options = {
	// 		url: item.api_endpoint,
	// 		method: 'POST',
	// 		headers: {
	// 		  'Accept': 'application/json',
	// 		  'content-type' : 'application/raw',
	// 		  'User-Agent': 'aladin-oracle'
	// 		},
	// 		timeout: 250,
	// 		json: parameters
	// 	};

	// 	await request(options, (err, res, body) => {  
	// 		// console.log("ressssssssssssssss", res)
	// 		if (res && res.statusCode == 200) {
	// 			body = JSON.parse(body);
	// 		  	console.log("body after", typeof body)
	// 			return getValueFromJson(json, json_field);		

	// 		}
	// 		else {
	// 		   return null
	// 		}
	// 	})
	// }

}


module.exports = RequestProcessor;