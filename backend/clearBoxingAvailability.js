const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://jeromemanuel2824:V*wazbpEiWUkd78@cluster0.co7g4r9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // <-- palitan kung iba ang string mo
const dbName = 'test'; // <-- palitan kung ano talaga ang db name mo

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const coaches = db.collection('coaches');
    // Update all coaches with Boxing in specialties, set availability to []
    const result = await coaches.updateMany(
      { specialties: { $elemMatch: { $regex: /boxing/i } } },
      { $set: { availability: [] } }
    );
    console.log(`Cleared availability for ${result.modifiedCount} Boxing coaches.`);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
