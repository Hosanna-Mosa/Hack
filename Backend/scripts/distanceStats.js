const mongoose = require('mongoose');
const Embedding = require('../models/Embedding');

async function checkVectors() {
  await mongoose.connect('mongodb+srv://sunandvemavarapu_db_user:wqr25yDcKahqsueS@attedence.mlkqvap.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Connected to MongoDB');

  const all = await Embedding.find({}).lean();
  console.log('total embeddings:', all.length);

  const bad = all.filter(e => !Array.isArray(e.vector) || e.vector.length !== 128);
  console.log('bad embeddings count:', bad.length);
  bad.slice(0, 5).forEach(e =>
    console.log('BAD:', e.sourceId, e.sourceType, 'len=', e.vector?.length)
  );

  await mongoose.disconnect();
}

checkVectors().catch(err => {
  console.error(err);
  process.exit(1);
});
