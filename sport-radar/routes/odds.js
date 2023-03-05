const router = require("express").Router();
const axios = require("axios");
const fs = require("fs");
const mongoose = require("mongoose");
const PlayersCollection = require("../database").PlayersCollection;
const TeamsCollection = require("../database").TeamsCollection;

const booksSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    total: {
        type: String,
        required: true,
    },
    over: {
        type: String,
        required: true,
    },
    under: {
        type: String,
        required: true,
    },
});

const playerPropSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        props: {
            points: {
                books: [booksSchema],
            },
            assists: {
                books: [booksSchema],
            },
            rebounds: {
                books: [booksSchema],
            },
            three_point_field_goals: {
                books: [booksSchema],
            },
            points_rebounds: {
                books: [booksSchema],
            },
            points_assists: {
                books: [booksSchema],
            },
            rebounds_assists: {
                books: [booksSchema],
            },
            points_rebounds_assists: {
                books: [booksSchema],
            },
        },
    },
    { collection: "Props" }
);

const Props = mongoose.model("Props", playerPropSchema);
const Books = mongoose.model("Books", booksSchema);

// An array of market props we will display to the user
const propsArray = [
    "total points (incl. overtime)",
    "total assists (incl. overtime)",
    "total rebounds (incl. overtime)",
    "total 3-point field goals (incl. overtime)",
    "total points plus rebounds (incl. extra overtime)",
    "total points plus assists (incl. extra overtime)",
    "total rebounds plus assists (incl. extra overtime)",
    "total points plus assists plus rebounds (incl. extra overtime)",
];

// An array of books we will display to the user
const books = ["MGM", "DraftKings", "FanDuel"];

// An array containing each prop name that a player can have
const propKeysToUpdate = [
    "points",
    "assists",
    "rebounds",
    "three_point_field_goals",
    "points_rebounds",
    "points_assists",
    "rebounds_assists",
    "points_rebounds_assists",
];

// An array of player mappings to help find player id efficiently
let mappings;

router.post("/odds/fetch-daily-player-props", async (req, res) => {
    let { date, start, apiKey } = req.body;
    try {
        const dailyProps = `https://api.sportradar.us/oddscomparison-player-props/trial/v2/en/sports/sr:sport:2/schedules/${date}/players_props.json?api_key=${apiKey}&start=${start}`;
        const response = await axios.get(dailyProps);
        const props = await parseDailyProps(response);
        

        res.set("Content-Type", "application/json");
        return res.status(200).send(JSON.stringify(props));
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server Error");
    }
});

/**
 * Reads a JSON file from the file system and returns an array of mappings.
 * The JSON file must be located at the specified file path and must contain
 * an array of objects with "id" and "external_id" properties.
 *
 * @returns {Array | undefined} - an array of mappings, where each mapping is an object
 * with "id" and "external_id" properties, or undefined if nothing is found
 */
function loadJsonFileToArray() {
    try {
        const data = fs.readFileSync(
            "C:/Users/reyna/Desktop/bet-mate/sport-radar/json-responses/playerMappings.json"
        );
        return JSON.parse(data).mappings;
    } catch (error) {
        console.error(error);
    }
}

async function parseDailyProps(response) {
    mappings = loadJsonFileToArray();
    let props = [];

    // Parse the response object and loop through each event
    const responseObj = response.data;
    for (const event of responseObj.sport_schedule_sport_events_players_props) {
        
        for (const players of event.players_props) {
            // Get the playerId and create a new temp Prop
            let id = await returnPlayerId(
                players.player.id,
                players.player.name
            );

            const tmpPlayerProp = new Props({
                id,
                fullName: reformatPlayerName(players.player.name),
                props: propKeysToUpdate.reduce((acc, key) => {
                    acc[key] = { books: [] };
                    return acc;
                }, {}),
            });

            for (const market of players.markets) {
                if (!propsArray.includes(market.name)) continue;

                const tmpBooks = market.books
                    .filter(book => books.includes(book.name))
                    .map(book => new Books({
                        name: book.name,
                        total: book.outcomes[0].total,
                        over: book.outcomes[0].odds_american,
                        under: book.outcomes[1].odds_american,
                    }));

                for (const propKey of propKeysToUpdate) {
                    if (tmpPlayerProp.props[propKey].books.length === 0) {
                        tmpPlayerProp.props[propKey].books = tmpBooks;
                        break;
                    }
                }
            }

            await addProp(tmpPlayerProp);
            props.push(tmpPlayerProp);
        }
    }

    return props;
}

async function addProp(tmpProp) {
    try {
        const filter = { id: tmpProp.id };
        const update = { fullName: tmpProp.fullName, props: tmpProp.props };
        const options = { upsert: true };

        await Props.updateOne(filter, update, options);
    } catch (err) {
        console.error("Error parsing schedule:", err);
    }
}


/**
 * Returns the external id for a player given their id, or attempts to find the player by their full name and returns their id
 *
 * @param {string} id - the id that corresponds to the player in database
 * @param {string} playerName - the full name of the player in the format "Last Name Suffix, First Name"
 * @returns {string|null} - the external id of mappings which is the id variable in Players Collection
 */
async function returnPlayerId(id, playerName) {
    // Search for mapping object with matching ID
    const mapping = mappings.find((mapping) => mapping.id === id);
    // If object exists return the players ID
    const externalId = mapping
        ? mapping.external_id
        // If no object exists find the playerID by their fullName
        : findPlayerByFullName(playerName);

    return externalId;
}


/**
 * Searches for a player in the database by their full name without suffixs or middle and returns
 * their ID, or null if not found
 *
 * @param {string} fullName - The full name of the player in the form "Last Suffix, First"
 * @returns {string|null} - The ID of the player if found, null otherwise
 */
async function findPlayerByFullName(fullName) {
    // Split the full name into first name and last name parts
    const nameParts = fullName.split(",");
    const lastName = nameParts[0].trim();
    const firstName = nameParts[1].trim().split(" ")[0].trim();

    try {
        // Find a player in the database matching first and last name
        const result = await PlayersCollection.findOne(
            { firstName, lastName },
            // project === only return the specified information
            { projection: { id: 1 } }
        );

        return result ? result.id : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Function to format a players name for a mongo collection
 *
 * @param {string} name - receives a name in the form "Last, First"
 * @returns {string} - returns the name in the form "First Last" with no suffixs or middle components
 */
function reformatPlayerName(name) {
    // Split the name into an array of parts at the comma
    const [lastName, ...firstNames] = name.split(",");

    // If the name doesn't contain a comma, return the original name
    if (firstNames.length === 0) {
        return name;
    }

    // Extract the first name and remove any extra whitespace
    const firstName = firstNames[0].trim();

    return `${firstName} ${lastName}`;
}

module.exports = router;
