/**
 * Quick Test Data Generator for Material Usage Statistics
 *
 * This script will insert sample material usage data into your database
 * so you can test the statistics feature immediately.
 *
 * Run this from MongoDB Compass, mongo shell, or use the script below.
 */

// Sample data for November 2025
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

console.log('Test data ready to insert:', testData.length, 'records');
console.log('This will create statistics for 5 materials in November 2025');

// To use this in MongoDB Compass or mongo shell:
// db.materialusages.insertMany(testData);

module.exports = testData;

