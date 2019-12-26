module.exports = function (mongooseClient) {
	const pending_request = new mongooseClient.Schema(
		{
			caller: {type: String, required: true, index: true},
			id: { type: Number, required: true, index: true },
			creation_time: { type: Date, required: true, index: true },
		},
		{ strict: true }
	);

	return mongooseClient.model('pending_request', pending_request);
};
