// Import dependencies 
const mongoose = require("mongoose");
const { env } = require('process');
require('dotenv').config();

const MONGO_CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING;

mongoose
    .connect(
        MONGO_CONNECTION_STRING,
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then()
    .catch((err) => console.error("Could not connect to MongoDB", err));

const PlayersCollection = mongoose.connection.collection("Players");
const TeamsCollection = mongoose.connection.collection("Teams");
const ScheduleCollection = mongoose.connection.collection("Schedule");

exports.PlayersCollection = PlayersCollection;
exports.TeamsCollection = TeamsCollection;
exports.ScheduleCollection = ScheduleCollection;