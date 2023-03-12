// Import dependencies 
const mongoose = require("mongoose");
const { env } = require('process');
require('dotenv').config();
const PLAYERS_COLLECTION_NAME = process.env.PLAYERS_COLLECTION_NAME;
const TEAMS_COLLECTION_NAME = process.env.TEAMS_COLLECTION_NAME;
const SCHEDULE_COLLECTION_NAME = process.env.SCHEDULE_COLLECTION_NAME;
const PROPS_COLLECTION_NAME = process.env.PROPS_COLLECTION_NAME;
const USERS_COLLECTION_NAME = process.env.USERS_COLLECTION_NAME;
const DATABASE_NAME = process.env.DATABASE_NAME;

const MONGO_CONNECTION_STRING = process.env.MONGO_CONNECTION_STRING;

mongoose
    .connect(
        MONGO_CONNECTION_STRING,
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then()
    .catch((err) => console.error("Could not connect to MongoDB", err));

const UserSchema = mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    username: {
        type: String,
        required: true,
        minLength: 5,
        maxLength: 20,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minLength: 64,
        maxLength: 64
    },
    email: {
        type: String,
        required: true,
        minLength: 5,
        maxLength: 100,
        unique: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    salt: {
        type: String,
        required: true
    },
    access_token: {
        type: String,
        required: true
    },
    date_created: {
        type: Date,
        required: true
    },
    last_login: {
        type: Date,
        required: true
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    }
});

const PlayersCollection = mongoose.connection.collection(PLAYERS_COLLECTION_NAME);
const TeamsCollection = mongoose.connection.collection(TEAMS_COLLECTION_NAME);
const ScheduleCollection = mongoose.connection.collection(SCHEDULE_COLLECTION_NAME);
const UsersCollection = mongoose.connection.collection(USERS_COLLECTION_NAME);
const User = mongoose.model('User', UserSchema);

exports.PlayersCollection = PlayersCollection;
exports.TeamsCollection = TeamsCollection;
exports.ScheduleCollection = ScheduleCollection;
exports.UsersCollection = UsersCollection;
exports.User = User;
exports.USERS_COLLECTION_NAME = USERS_COLLECTION_NAME;
exports.DATABASE_NAME = DATABASE_NAME;