require('dotenv').config(); 
const { MongoClient } = require('mongodb');
const { MongoMemoryServer} = require('mongodb-memory-server');

let mongoClient = null;
let MemoryServer = null; 
let Uri = null;

const CreateMongoDbConnection = () => {
  const env = process.env.DEVELOPMENT_MODE || 'production';
  if(env === 'testing'){ 
    return new Promise(async (resolve, reject)=>{ 
      try{
        if(mongoClient){ 
          return resolve(mongoClient); 
        }
        if(!MemoryServer){ 
          MemoryServer = await MongoMemoryServer.create();  
          Uri = await MemoryServer.getUri();  
        }


        client = new MongoClient(Uri); 
      
        await client.connect(); 
        mongoClient = client; 

        resolve(mongoClient); 

      }catch(error){ 
        return resolve(new Error(error.message || "Unknown error occured"))
      }

    })
  }

  return new Promise(async (resolve, reject) => {
    try {
      if (mongoClient) {
        // Return existing client if already connected
        return resolve(mongoClient);
      }

      // Replace with your MongoDB URI
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



describe('Connection testing', ()=>{ 
  test('It should create a connection', async()=>{ 
    const connection = await CreateMongoDbConnection(); 
     
    expect(connection).toBeDefined(); 
  })

})