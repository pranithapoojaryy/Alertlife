const { MongoMemoryServer } = require('mongodb-memory-server');

async function test() {
  console.log('Starting MongoMemoryServer...');
  try {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log('SUCCESS! MongoMemoryServer URI:', uri);
    await mongoServer.stop();
    process.exit(0);
  } catch (err) {
    console.error('FAILED to start MongoMemoryServer:', err);
    process.exit(1);
  }
}

test();
