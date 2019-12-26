const { Api, JsonRpc } = require('alaiojs');
const { JsSignatureProvider } = require('alaiojs/dist/alaiojs-jssig');   // development only
const fetch = require('node-fetch');                                 // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                // node only; native TextEncoder/Decoder


class ContractInteraction {

	constructor(options) {
		this.options = options;
		const endpoint = options.ala_data.endpoint;

		const private_key = options.private_key.replace(/{PRIVATE_ACTIVE_KEY}/g, process.env.PRIVATE_ACTIVE_KEY);
		const signatureProvider = new JsSignatureProvider([private_key]);

		this.rpc = new JsonRpc(endpoint, { fetch });
		this.api = new Api({ rpc: this.rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
	}

	/*
	 * Gets request info from requests table by caller and id
	 */
	async getRequestById(caller, id) {
		return await this.rpc.get_table_rows({
			json: true,
			code: this.options.ala_data.oracle_contract_name,
			scope: caller,
			table: 'requests',
			lower_bound: id
		});
	}

	/*
	 * Executes transaction providing response for request with request_id=id
	 */
	async reply(caller, id, response) {
		const contract_name = this.options.ala_data.oracle_contract_name;
		console.log('Executing ', contract_name, '::reply(', caller, ', ', id, ', ', response, ')');
		return this.api.transact({
			actions: [{
				account: contract_name,
				name: 'reply',
				authorization: [{
					actor: this.options.ala_data.oracle_account,
					permission: 'active',
				}],
				data: {
					caller: caller,
					request_id: id,
					response: response,
				},
			}]
		}, {
			blocksBehind: 3,
			expireSeconds: 30,
		});
	}
}


module.exports = ContractInteraction;