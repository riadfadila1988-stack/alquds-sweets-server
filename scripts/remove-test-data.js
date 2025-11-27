/**
 * Script to remove test data from Material Usage Statistics
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function removeTestData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alquds-sweets';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Define schema
    const MaterialUsageSchema = new mongoose.Schema({
      materialId: String,
      materialName: String,
      previousQuantity: Number,
      newQuantity: Number,
      quantityChange: Number,
      userId: String,
      userName: String,
      timestamp: Date,
    });

    const MaterialUsage = mongoose.models.MaterialUsage || mongoose.model('MaterialUsage', MaterialUsageSchema);

    // Count before
    const beforeCount = await MaterialUsage.countDocuments();
    console.log(`📦 Total records before: ${beforeCount}`);

    // Remove test data (records with test_material_ prefix)
    console.log('🧹 Removing test data...');
    const result = await MaterialUsage.deleteMany({
      materialId: { $regex: '^test_material_' }
    });

    console.log(`✅ Deleted ${result.deletedCount} test records`);

    // Count after
    const afterCount = await MaterialUsage.countDocuments();
    console.log(`📦 Total records after: ${afterCount}`);
    console.log(`✨ Real usage records remaining: ${afterCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

removeTestData();

