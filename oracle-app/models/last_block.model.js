module.exports = function (mongooseClient) {
  const last_block = new mongooseClient.Schema(
    {},
    { strict: false }
  );

  return mongooseClient.model('last_block', last_block);
};
