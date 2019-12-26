module.exports = function (mongooseClient) {
	const request_response = new mongooseClient.Schema(
		{
			caller: {type: String, required: true, index: true},
			id: { type: Number, required: true, index: true },
			creation_time: { type: Date, required: true },
			target_time: { type: Date, required: true, index: true },
            response: { type: String },
		},
		{ strict: true }
	);

	return mongooseClient.model('request_response', request_response);
};
