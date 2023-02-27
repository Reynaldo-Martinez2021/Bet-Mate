const router = require("express").Router();
const axios = require("axios");
const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        home: {
            id: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
        },
        away: {
            id: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
        },
        date: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
        },
    },
    { collection: "Schedule" }
);

mongoose
    .connect(
        "mongodb+srv://knighthacks17:knighthacks6900@betmate.yqz1nbu.mongodb.net/BetMate?retryWrites=true&w=majority",
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then()
    .catch((err) => console.error("Could not connect to MongoDB", err));

const Schedules = mongoose.model("Schedule", scheduleSchema);
const ScheduleCollection = mongoose.connection.collection("Schedule");

/**
 * Fetches the NBA season schedule for a given year and season type from the Sportradar API.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Promise} - A Promise that resolves to a JSON response containing the season schedule.
 */
router.post("/schedule/fetch-season-schedule", async (req, res) => {
    let { seasonYear, seasonType, apiKey } = req.body;
    try {
        const scheduleAPI = `http://api.sportradar.us/nba/trial/v7/en/games/${seasonYear}/${seasonType}/schedule.json?api_key=${apiKey}`;
        const response = await axios.get(scheduleAPI);
        const games = await parseSchedule(response);

        res.set("Content-Type", "application/json");
        return res.status(200).send(JSON.stringify(games));
    } catch (err) {
        // ADD Error code
        console.log(err);
        return res.status(500).send("Server error");
    }
});

/**
 * Parses a schedule response object and adds new games to the database if they don't already exist.
 *
 * @param {Object} response - The response object to parse.
 * @returns {Promise<Array>} - A Promise that resolves to an array of game objects.
 */
async function parseSchedule(response) {
    const responseObj = response.data;
    const games = [];

    try {
        for (const game of responseObj.games) {
            const { id, home, away, scheduled, status } = game;

            const filter = { id };
            const update = {
                $setOnInsert: {
                    id,
                    home,
                    away,
                    date: new Date(Date.parse(scheduled)),
                    status,
                },
            };
            const options = { upsert: true, new: true };

            await Schedules.updateOne(filter, update, options);
            games.push({ id, home, away, date: scheduled, status });
        }
        return games;
    } catch (err) {
        console.error("Error parsing schedule:", err);
        throw err;
    }
}

router.get("/nba/closed-games", async (req, res) => {
    try {
        const closedDocs = await ScheduleCollection.find({ status: "closed" }).toArray();
        const gameIds = closedDocs.map(game => game.id);
        return res.status(200).json(gameIds);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
