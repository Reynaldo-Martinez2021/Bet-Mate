const router = require("express").Router();
const axios = require("axios");
const mongoose = require("mongoose");
const PlayersCollection = require("../database").PlayersCollection;
const TeamsCollection = require("../database").TeamsCollection;


/**
 * Handles POST request to fetch box score from NBA API and update PlayersCollection with new box scores
 * 
 * @param {Object} req - The request object containing gameId in req.body
 * @param {Object} res - The response object to be returned
 * @returns {Promise<Object>} - The response object contanining player statistics
 * 
 */
router.post("/games/fetch-box-score", async (req, res) => {
    let { gameId, apiKey } = req.body;
    try {
        const gameSummaryAPI = `http://api.sportradar.us/nba/trial/v7/en/games/${gameId}/summary.json?api_key=${apiKey}`;
        const response = await axios.get(gameSummaryAPI);
        const statLines = await parseGameSummary(response, gameId);

        res.set("Content-Type", "application/json");
        console.log("stat line sent");
        return res.status(200).send(JSON.stringify(statLines));
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server error");
    }
});

/**
 * Parses game summary and returns an array of player statistics
 * 
 * @param {Object} response - The game summary response object 
 * @returns {Promise<Array>} - An array of object containing player statistics
 */
async function parseGameSummary(response, gameId) {
    const responseObj = response.data;
    const statLines = [];

    parsePlayers(responseObj.home.players, statLines, gameId);
    parsePlayers(responseObj.away.players, statLines, gameId);

    return statLines;
}

/**
 * Parses player statistics and updates the PlayersCollection with new box scores.
 *
 * @param {Array<Object>} players - An array of player objects to be parsed.
 * @param {Array<Object>} statLines - An array of objects containing player statistics to be returned.
 * @returns {Promise<Array<Object>>} - An array of objects containing player statistics.
 * @throws {Error} - If there was an error updating a player in the database.
 */
async function parsePlayers(players, statLines, gameId) {
    for (const player of players) {
        const { id, full_name, statistics: { three_points_made, rebounds, assists, points } } = player;

        try {
            const filter = { id: id };
            const update = {
                $addToSet: {
                    boxScores: {
                        id: gameId,
                        points: points,
                        rebounds: rebounds,
                        assists: assists,
                        threes_made: three_points_made,
                    },
                },
            };
            const options = { new: true };
            PlayersCollection.findOneAndUpdate(filter, update, options);
            statLines.push({
                full_name,
                gameId,
                points,
                rebounds,
                assists,
                three_points_made,
            });
        } catch (err) {
            console.error("Error updating player:", err);
        }
    }
}

module.exports = router;
