const fs = require('fs');
const path = require('path');

module.exports = async () => {
  if (global.__MONGO_MEM_SERVER__) {
    await global.__MONGO_MEM_SERVER__.stop();
  }

  const uriFile = path.join(__dirname, '.test-mongodb-uri');
  try {
    fs.unlinkSync(uriFile);
  } catch (err) {
    // already gone
  }
};