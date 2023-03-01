const router = require("express").Router();
const axios = require("axios");
const mongoose = require("mongoose");
const TeamsCollection = require("../database").TeamsCollection;

const playerSchema = new mongoose.Schema({
    id: String,
    firstName: String,
    lastName: String,
});

const teamSchema = new mongoose.Schema(
    {
        id: String,
        name: String,
        market: String,
        reference: String,
        players: [playerSchema],
    },
    { collection: "Teams" }
);

const Teams = mongoose.model("Teams", teamSchema);

/**
 * Retrieves the NBA league hierarchy from the Sportradar API and returns the Teams Collection.
 *
 * If the Teams Collection is empty, the function calls the parseLeagueHierarchy function to populate the collection.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object containing the Teams Collection.
 * @throws {Error} - If an error occurs while retrieving the league hierarchy or the Teams Collection.
 */
router.post("/team/league-hierarchy", async (req, res) => {
    let { apiKey } = req.body;
    const leagueHierarchyAPI = `http://api.sportradar.us/nba/trial/v7/en/league/hierarchy.json?api_key=${apiKey}`;

    try {
        let response = await axios.get(leagueHierarchyAPI);

        // check if collection is empty to add nba teams to Teams Collection
        if (checkIfCollectionIsEmpty()) {
            parseLeagueHierarchy(response);
        }

        res.set("Content-Type", "application/json");
        TeamsCollection.find()
            .toArray()
            .then((docs) => {
                return res.status(200).send(JSON.stringify(docs));
            })
            .catch((err) => {
                return res
                    .status(500)
                    .send("Error retrieving documents from collection");
            });
    } catch (err) {
        return res.status(500).send("Server error");
    }
});

/**
 * Checks if the Teams Collection is empty or not.
 *
 * @returns {Promise<boolean>} - A promise that resolves to true if the collection is empty, and false otherwise.
 * @throws {Error} - If an error occurs while checking the Teams Collection.
 */
async function checkIfCollectionIsEmpty() {
    try {
        const count = await TeamsCollection.countDocuments();
        return count === 0;
    } catch (err) {
        throw new Error("Error checking Teams Collection: " + err.message);
    }
}

/**
 * Parses the league hierarchy response from the Sportradar API and saves each team to the Teams Collection.
 *
 * The league hierarchy is divided into conferences, each of which is further divided into divisions, and each division has 5 teams.
 * The function creates a new team object for each team in the league hierarchy and saves it to the Teams Collection.
 *
 * @param {Object} response - The response data from the league hierarchy API.
 * @throws {Error} - If an error occurs while parsing the league hierarchy response or saving teams to the Teams Collection.
 */
function parseLeagueHierarchy(response) {
    const responseObj = response.data;

    for (const conference of responseObj.conferences) {
        for (const division of conference.divisions) {
            for (const team of division.teams) {
                let tmpTeam = new Teams({
                    id: team.id,
                    name: team.name,
                    market: team.market,
                    reference: team.reference,
                    players: [],
                });

                tmpTeam.save(function (err, result) {
                    if (err) {
                        throw new Error(
                            "Error saving team to Teams Collection: " +
                                err.message
                        );
                    }
                });
            }
        }
    }
}

/**
 * Retrieves the team profile data from the Sportradar API for the specified team ID and returns the parsed response.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object containing the parsed team profile data.
 * @throws {Error} - If an error occurs while retrieving or parsing the team profile data.
 */
router.post("/team/fetch-team-profile", async (req, res) => {
    let { teamId, apiKey } = req.body;
    try {
        const teamProfileAPI = `http://api.sportradar.us/nba/trial/v7/en/teams/${teamId}/profile.json?api_key=${apiKey}`;

        const response = await axios.get(teamProfileAPI);
        const teamProfile = parseTeamProfile(response, teamId);

        res.set("Content-Type", "application/json");
        return res.status(200).send(JSON.stringify(teamProfile));
    } catch (err) {
       console.error(err);
       return res.status(500).send(JSON.stringify({status: "ERROR"}));
    }
});

/**
 * Parses the team profile response from the Sportradar API for the specified team ID and returns an array of player objects.
 * If the specified team is found in the Teams Collection, the function will not modify the collection.
 *
 * @param {Object} response - The response data from the team profile API.
 * @param {string} teamId - The ID of the team to parse the profile for.
 * @returns {Object[]} - An array of player objects containing the ID, first name, and last name of each player on the team.
 * @throws {Error} - If an error occurs while parsing the team profile data or updating the Teams Collection.
 */
function parseTeamProfile(response, teamId) {
    const responseObj = response.data;
    const players = [];

    for (const player of responseObj.players) {
        const newPlayer = {
            id: player.id,
            firstName: player.first_name,
            lastName: player.last_name,
        };

        players.push(newPlayer);
    }

    return Teams.findOne({ id: teamId })
        .exec()
        .then((team) => {
            if (team) {
                // if the players array is already populated, don't add any more players
                if (team.players.length !== 0) {
                    console.log("Players array is not empty");
                    return players;
                } else {
                    team.players.push(...players);

                    return team.save().then(() => {
                        console.log("Team document updated successfully!");
                        return players;
                    });
                }
            } else {
                console.log("Team document not found.");
                return players;
            }
        })
        .catch((err) => {
            throw new Error("Error updating team document: " + err.message);
        });
}

module.exports = router;
