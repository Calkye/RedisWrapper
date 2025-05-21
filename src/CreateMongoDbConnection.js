const { MongoClient } = require('mongodb');

let mongoClient = null;

const CreateMongoDbConnection = () => {
  return new Promise(async (resolve, reject) => {
    try {
      if (mongoClient) {
        return resolve(mongoClient);
      }

      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

      const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await client.connect();

      mongoClient = client;

      resolve(mongoClient);
    } catch (error) {
      reject(new Error(error.message || 'Unknown error occurred'));
    }
  });
};

module.exports = CreateMongoDbConnection;
