/**
 * Script to populate test data for Material Usage Statistics
 * Run this to quickly generate sample data for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

const testData = [
  {
    materialId: "test_material_1",
    materialName: "سكر (Sugar)",
    previousQuantity: 100,
    newQuantity: 85,
    quantityChange: -15,
    userId: "test_user_1",
    userName: "أحمد",
    timestamp: new Date("2025-11-05T10:00:00.000Z"),
    createdAt: new Date("2025-11-05T10:00:00.000Z"),
    updatedAt: new Date("2025-11-05T10:00:00.000Z")
  },
  {
    materialId: "test_material_1",
    materialName: "سكر (Sugar)",
    previousQuantity: 85,
    newQuantity: 150,
    quantityChange: 65,
    userId: "test_user_2",
    userName: "محمد",
    timestamp: new Date("2025-11-08T14:30:00.000Z"),
    createdAt: new Date("2025-11-08T14:30:00.000Z"),
    updatedAt: new Date("2025-11-08T14:30:00.000Z")
  },
  {
    materialId: "test_material_1",
    materialName: "سكر (Sugar)",
    previousQuantity: 150,
    newQuantity: 120,
    quantityChange: -30,
    userId: "test_user_1",
    userName: "أحمد",
    timestamp: new Date("2025-11-10T09:15:00.000Z"),
    createdAt: new Date("2025-11-10T09:15:00.000Z"),
    updatedAt: new Date("2025-11-10T09:15:00.000Z")
  },
  {
    materialId: "test_material_2",
    materialName: "دقيق (Flour)",
    previousQuantity: 50,
    newQuantity: 100,
    quantityChange: 50,
    userId: "test_user_2",
    userName: "محمد",
    timestamp: new Date("2025-11-06T11:00:00.000Z"),
    createdAt: new Date("2025-11-06T11:00:00.000Z"),
    updatedAt: new Date("2025-11-06T11:00:00.000Z")
  },
  {
    materialId: "test_material_2",
    materialName: "دقيق (Flour)",
    previousQuantity: 100,
    newQuantity: 75,
    quantityChange: -25,
    userId: "test_user_1",
    userName: "أحمد",
    timestamp: new Date("2025-11-09T15:45:00.000Z"),
    createdAt: new Date("2025-11-09T15:45:00.000Z"),
    updatedAt: new Date("2025-11-09T15:45:00.000Z")
  },
  {
    materialId: "test_material_3",
    materialName: "زبدة (Butter)",
    previousQuantity: 30,
    newQuantity: 20,
    quantityChange: -10,
    userId: "test_user_2",
    userName: "محمد",
    timestamp: new Date("2025-11-07T13:20:00.000Z"),
    createdAt: new Date("2025-11-07T13:20:00.000Z"),
    updatedAt: new Date("2025-11-07T13:20:00.000Z")
  },
  {
    materialId: "test_material_3",
    materialName: "زبدة (Butter)",
    previousQuantity: 20,
    newQuantity: 25,
    quantityChange: 5,
    userId: "test_user_1",
    userName: "أحمد",
    timestamp: new Date("2025-11-11T08:00:00.000Z"),
    createdAt: new Date("2025-11-11T08:00:00.000Z"),
    updatedAt: new Date("2025-11-11T08:00:00.000Z")
  },
  {
    materialId: "test_material_4",
    materialName: "حليب (Milk)",
    previousQuantity: 80,
    newQuantity: 60,
    quantityChange: -20,
    userId: "test_user_2",
    userName: "محمد",
    timestamp: new Date("2025-11-04T16:30:00.000Z"),
    createdAt: new Date("2025-11-04T16:30:00.000Z"),
    updatedAt: new Date("2025-11-04T16:30:00.000Z")
  },
  {
    materialId: "test_material_5",
    materialName: "بيض (Eggs)",
    previousQuantity: 200,
    newQuantity: 180,
    quantityChange: -20,
    userId: "test_user_1",
    userName: "أحمد",
    timestamp: new Date("2025-11-03T10:00:00.000Z"),
    createdAt: new Date("2025-11-03T10:00:00.000Z"),
    updatedAt: new Date("2025-11-03T10:00:00.000Z")
  },
  {
    materialId: "test_material_5",
    materialName: "بيض (Eggs)",
    previousQuantity: 180,
    newQuantity: 300,
    quantityChange: 120,
    userId: "test_user_2",
    userName: "محمد",
    timestamp: new Date("2025-11-06T12:00:00.000Z"),
    createdAt: new Date("2025-11-06T12:00:00.000Z"),
    updatedAt: new Date("2025-11-06T12:00:00.000Z")
  }
];

async function populateTestData() {
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
      createdAt: Date,
      updatedAt: Date
    });

    const MaterialUsage = mongoose.models.MaterialUsage || mongoose.model('MaterialUsage', MaterialUsageSchema);

    // Clear existing test data (optional)
    console.log('🧹 Clearing existing test data...');
    await MaterialUsage.deleteMany({ materialId: { $regex: '^test_material_' } });

    // Insert test data
    console.log('📥 Inserting test data...');
    const result = await MaterialUsage.insertMany(testData);
    console.log(`✅ Successfully inserted ${result.length} records`);

    // Verify data
    const count = await MaterialUsage.countDocuments();
    console.log(`📊 Total records in database: ${count}`);

    // Show sample aggregation
    const stats = await MaterialUsage.aggregate([
      {
        $match: {
          timestamp: {
            $gte: new Date('2025-11-01'),
            $lte: new Date('2025-11-30T23:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: '$materialId',
          materialName: { $first: '$materialName' },
          totalUsed: {
            $sum: {
              $cond: [
                { $lt: ['$quantityChange', 0] },
                { $abs: '$quantityChange' },
                0
              ]
            }
          },
          totalAdded: {
            $sum: {
              $cond: [
                { $gt: ['$quantityChange', 0] },
                '$quantityChange',
                0
              ]
            }
          },
          netChange: { $sum: '$quantityChange' }
        }
      }
    ]);

    console.log('\n📈 Statistics for November 2025:');
    stats.forEach(stat => {
      console.log(`  - ${stat.materialName}:`);
      console.log(`    Used: ${stat.totalUsed}, Added: ${stat.totalAdded}, Net: ${stat.netChange > 0 ? '+' : ''}${stat.netChange}`);
    });

    console.log('\n🎉 Test data populated successfully!');
    console.log('👉 Now refresh your Statistics screen in the app');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

populateTestData();

