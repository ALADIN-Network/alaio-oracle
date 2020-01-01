module.exports = function (mongooseClient) {
	const audit_trail = new mongooseClient.Schema(
		{
			caller: {type: String},
			request_id: { type: String},
			time: { type: String },
            api_set: [{
                api: {type: String},
                request_type : {type: String},
                json_field : {type: String},
				parameter : {type: String},
				response : {type: String}
			}],
			response_type : {type : String},
			aggregation_type : {type : String},
			oracle_account : {type: String},
			aggregated_response : {type : String}
		},
	);

	return mongooseClient.model('audit_trail', audit_trail, 'audit_trail');
};
























