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

/*
    const { MongoClient } = require("mongodb");
    const { env } = require('process');
    require('dotenv').config();
        - this section imports the necessary dependecies for the script to run
        - `MongoClient` is imported from `mongodb` package, while `env` is imported
        from the `process` package
        - `dotenv` is also importanted and config to allow enviroment variables to
        be loaded from a `.env` file

    const uri = process.env.MONGO_CONNECTION_STRING;
    const client = new MongoClient(uri);
        - `uri` var is set to the value `MONGO_CONNECTION_STRING` enviroment
        var, which is used to connect to a mongoDB database.
        - `client` variable is then set to a new instance of the `MongoClient` class
        using the `uri` var as a parameter

    async function main()
        - function that connects the `client` to the MongoDB database
    
    async function getMongoCollection()
        - function is used to retrieve a specific collection from a MongoDB database
        and it takes two parameters
            - `databaseName` which is a string representing the name of the database
            - `collectionName` which is a string representing the name of the collection
        - function attemps to retrieve the database and collection using `client.db()`
        and `database.collection()` mehtods
*/