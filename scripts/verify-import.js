// scripts/verify-import.js
const admin = require('firebase-admin');
const serviceAccount = require('./asset-register-website-firebase-adminsdk-fbsvc-8850f387be.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verifyImport() {
  console.log('🔍 Verifying import...\n');
  
  const collections = ['assets', 'extraAssets', 'rentals', 'paths'];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).limit(5).get();
      console.log(`📊 ${collectionName}: ${snapshot.size} documents (showing up to 5)`);
      
      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        console.log(`   Sample document ID: ${firstDoc.id}`);
        console.log(`   Sample data:`, JSON.stringify(firstDoc.data(), null, 2).substring(0, 200) + '...');
        console.log('');
      }
    } catch (error) {
      console.log(`❌ Error fetching ${collectionName}:`, error.message);
    }
  }
  
  // Get total counts
  console.log('\n📈 Total counts:');
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      console.log(`   ${collectionName}: ${snapshot.size} documents`);
    } catch (error) {
      console.log(`   ${collectionName}: Error - ${error.message}`);
    }
  }
  
  process.exit(0);
}

verifyImport();
