// Import dependencies 
const { MongoClient } = require("mongodb");
const { env } = require('process');
require('dotenv').config();

// Creates Mongo Client
const uri = process.env.MONGO_CONNECTION_STRING;
const client = new MongoClient(uri);

main();

async function main() {
    await client.connect();
}

// Returns Mongo Collection with given database and collection name
async function getMongoCollection(databaseName, collectionName) {
    let collection = null;
    try {
        const database = client.db(databaseName);
        collection = database.collection(collectionName);
    } finally {
        return collection;
    }
}

exports.getMongoCollection = getMongoCollection;