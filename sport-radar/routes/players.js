const router = require("express").Router();
const axios = require("axios");
const mongoose = require("mongoose");
const PlayersCollection = require("../database").PlayersCollection;
const TeamsCollection = require("../database").TeamsCollection;

const boxScoreSchema = new mongoose.Schema({
    id: String,
    points: Number,
    assists: Number,
    rebounds: Number,
    three_points_made: Number,
});

const playersSchema = new mongoose.Schema(
    {
        id: String,
        teamName: String,
        firstName: String,
        lastName: String,
        position: String,
        reference: String,
        gamesPlayed: Number,
        ppg: Number,
        apg: Number,
        rpg: Number,
        threepg: Number,
        boxScores: [boxScoreSchema],
    },
    { collection: "Players" }
);

const Players = mongoose.model("Players", playersSchema);

/**
 * Retrieves the averages for all players on a team's roster using the Seasonal Statistics (Season to Date) API.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} - The response object containing an array of player objects with the following variables: id, firstName, lastName, position, reference, gamesPlayed, ppg, apg, rpg, threepg, and boxScores.
 * @throws {Error} - If an error occurs while retrieving the player statistics or parsing the response data.
 */
router.post("/players/seasonal-statistics", async (req, res) => {
    let { teamId, apiKey } = req.body;
    try {
        const playerProfileAPI = `http://api.sportradar.us/nba/trial/v7/en/seasons/2022/REG/teams/${teamId}/statistics.json?api_key=${apiKey}`;

        const response = await axios.get(playerProfileAPI);
        const seasonStats = await parseSeasonalStatistics(response, teamId);

        res.set("Content-Type", "application/json");
        return res.status(200).send(JSON.stringify(seasonStats));
    } catch (err) {
        // ADD Error code
        return res.status(500).send("Server error");
    }
});

/**
 * Parses the Seasonal Statistics API and returns an array of player objects.
 *
 * The function uses a findOne query to the Teams Collection to check if a player ID exists in the team's players array.
 * If the player ID is found, the addPlayer function is called to determine whether to add the player to the Players Collection or not.
 *
 * @param {Object} response - The response data from the API.
 * @param {String} teamId - The ID of the team in the Teams Collection.
 * @returns {Array} - An array of player objects containing the following variables: id, firstName, lastName, position, reference, gamesPlayed, ppg, apg, rpg, threepg, and boxScores.
 */
async function parseSeasonalStatistics(response, teamId) {
    const responseObj = response.data;
    const players = [];
    for (const player of responseObj.players) {
        let tmpPlayer = new Players({
            id: player.id,
            teamName: responseObj.name,
            firstName: player.first_name,
            lastName: player.last_name,
            position: player.primary_position,
            reference: player.reference,
            gamesPlayed: player.total.games_played,
            ppg: player.average.points,
            apg: player.average.assists,
            rpg: player.average.rebounds,
            threepg: player.average.three_points_made,
            boxScores: [],
        });

        // Code makes sure that we only add players that are on the roster, API response has outdated rosters
        const query = {
            id: teamId,
            players: { $elemMatch: { id: player.id } },
        };

        try {
            const team = await TeamsCollection.findOne(query);
            if (team) {
                await addPlayer(tmpPlayer);
                players.push(tmpPlayer);
            } else {
                console.log("Player id not found in the roster");
            }
        } catch (err) {
            // ADD Error Code
        }
    }

    return players;
}

/**
 * Finds a player in the Players collection by the `id` field and updates the player's fields
 * if the player exists, or saves a new player if the player does not exist.
 * 
 * @param {Object} tmpPlayer - The player object containing the fields to update or save.
 *  Required fields: id, gamesPlayed, ppg, apg, rpg, threepg
 */
async function addPlayer(tmpPlayer) {
    const query = { id: tmpPlayer.id };
    try {
        const player = await PlayersCollection.findOne(query);
        if (!player) {
            try {
                await tmpPlayer.save();
                console.log("Player added");
            } catch (err) {
                console.error("Error saving player:", err);
            }
        } else {
            const playerId = player._id;
            const { gamesPlayed, ppg, apg, rpg, threepg } = tmpPlayer;
            const updateObj = { $set: { gamesPlayed, ppg, apg, rpg, threepg } };

            const updatedPlayer = await Players.findByIdAndUpdate(playerId, updateObj, { new: true });

            if (updatedPlayer) {
                console.log("Player updated");
            }
        }
    } catch (err) {
        console.error("Error adding/updating player:", err);
        throw err;
    }
}

module.exports = router;
