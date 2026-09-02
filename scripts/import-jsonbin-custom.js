// scripts/import-jsonbin-custom.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================
// STEP 2A: Initialize Firebase Admin
// ============================================
const serviceAccount = require('./asset-register-website-firebase-adminsdk-fbsvc-8850f387be.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const BATCH_SIZE = 500;

// ============================================
// STEP 2B: READ YOUR JSON BIN DATA
// ============================================
const jsonBinData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'your-jsonbin-data.json'), 'utf8')
);

console.log('📦 JSON Bin Data loaded successfully!');
console.log(`   - Assets: ${jsonBinData.assets?.length || 0} items`);
console.log(`   - Extra Assets: ${Object.keys(jsonBinData.extraAssets || {}).length} categories`);
console.log(`   - Rental Items: ${jsonBinData.rentalItems?.length || 0} items`);
console.log(`   - Paths: ${jsonBinData.paths?.length || 0} items\n`);

// ============================================
// STEP 2C: MAPPING FUNCTIONS
// ============================================

/**
 * Map 'assets' array to Firestore 'assets' collection
 * Each asset becomes a document with seating_id as the document ID
 */
function mapAssetsToFirestore(assets) {
  if (!assets || assets.length === 0) return [];

  return assets.map(asset => {
    // Use seating_id as the document ID if it exists
    const docId = asset.seating_id || `asset_${asset.si_no}`;
    
    // Clean up the data - remove undefined/null values (optional)
    const cleanedData = {};
    for (const [key, value] of Object.entries(asset)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    }
    
    // Add metadata
    cleanedData._importedAt = new Date().toISOString();
    cleanedData._source = 'jsonbin';
    
    return {
      id: docId,
      data: cleanedData
    };
  });
}

/**
 * Map 'extraAssets' to Firestore 'extraAssets' collection
 * Each category (cpu, monitor, keyboard, mouse) becomes a document
 */
function mapExtraAssetsToFirestore(extraAssets) {
  if (!extraAssets) return [];

  const documents = [];
  
  for (const [category, items] of Object.entries(extraAssets)) {
    if (!items || items.length === 0) continue;
    
    // Create a document for each category
    documents.push({
      id: `category_${category}`,
      data: {
        category: category,
        items: items,
        totalItems: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        _importedAt: new Date().toISOString(),
        _source: 'jsonbin'
      }
    });
    
    // Optionally: Create individual items as separate documents
    // Uncomment this if you want each item as a separate document
    /*
    items.forEach((item, index) => {
      documents.push({
        id: `${category}_${index + 1}`,
        data: {
          category: category,
          brand: item.brand || '',
          quantity: item.quantity || 0,
          _importedAt: new Date().toISOString(),
          _source: 'jsonbin'
        }
      });
    });
    */
  }
  
  return documents;
}

/**
 * Map 'rentalItems' to Firestore 'rentals' collection
 */
function mapRentalItemsToFirestore(rentalItems) {
  if (!rentalItems || rentalItems.length === 0) return [];

  return rentalItems.map((item, index) => {
    const docId = `rental_${item.batchNo}_${index + 1}`;
    
    const cleanedData = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value;
      }
    }
    
    // Convert date strings to proper dates if needed
    if (cleanedData.receivedDate) {
      // Parse date format "25-08-2024" to ISO
      const parts = cleanedData.receivedDate.split('-');
      if (parts.length === 3) {
        cleanedData.receivedDateISO = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`;
      }
    }
    
    cleanedData._importedAt = new Date().toISOString();
    cleanedData._source = 'jsonbin';
    cleanedData.status = cleanedData.status || 'active'; // Default status
    
    return {
      id: docId,
      data: cleanedData
    };
  });
}

/**
 * Map 'paths' to Firestore 'paths' collection
 */
function mapPathsToFirestore(paths) {
  if (!paths || paths.length === 0) return [];

  return paths.map((path, index) => {
    const docId = `path_${path.category || 'uncategorized'}_${index + 1}`;
    
    const cleanedData = {
      category: path.category || 'Uncategorized',
      name: path.name || '',
      path: path.path || '',
      isActive: true, // Default to active
      _importedAt: new Date().toISOString(),
      _source: 'jsonbin'
    };
    
    return {
      id: docId,
      data: cleanedData
    };
  });
}

// ============================================
// STEP 2D: IMPORT FUNCTION
// ============================================
async function importCollection(collectionName, documents) {
  if (!documents || documents.length === 0) {
    console.log(`⚠️ No documents to import for "${collectionName}"`);
    return;
  }

  console.log(`📥 Importing ${documents.length} documents into "${collectionName}"...`);
  
  let batch = db.batch();
  let count = 0;
  let commitCount = 0;
  
  for (const doc of documents) {
    const docRef = db.collection(collectionName).doc(doc.id);
    batch.set(docRef, doc.data);
    count++;
    commitCount++;
    
    if (commitCount === BATCH_SIZE) {
      await batch.commit();
      console.log(`✅ Committed ${count} documents to "${collectionName}"`);
      batch = db.batch();
      commitCount = 0;
    }
  }
  
  if (commitCount > 0) {
    await batch.commit();
    console.log(`✅ Committed final ${count} documents to "${collectionName}"`);
  }
  
  console.log(`✅ Finished importing "${collectionName}" (${count} documents)\n`);
}

// ============================================
// STEP 2E: RUN THE IMPORT
// ============================================
async function runImport() {
  try {
    console.log('🚀 Starting JSON Bin to Firestore Import...\n');
    
    // Prepare all collections
    const collections = {
      'assets': mapAssetsToFirestore(jsonBinData.assets),
      'extraAssets': mapExtraAssetsToFirestore(jsonBinData.extraAssets),
      'rentals': mapRentalItemsToFirestore(jsonBinData.rentalItems),
      'paths': mapPathsToFirestore(jsonBinData.paths)
    };
    
    // Show import summary
    console.log('📋 Import Summary:');
    for (const [name, docs] of Object.entries(collections)) {
      console.log(`   - ${name}: ${docs.length} documents`);
    }
    console.log('');
    
    // Import each collection
    for (const [collectionName, documents] of Object.entries(collections)) {
      await importCollection(collectionName, documents);
    }
    
    console.log('🎉 All imports completed successfully!');
    console.log(`📊 Total collections imported: ${Object.keys(collections).length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runImport();