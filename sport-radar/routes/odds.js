const router = require("express").Router();
const axios = require("axios");
const mongoose = require("mongoose");

const booksSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    over: {
        type: Number,
        required: true,
    },
    under: {
        type: Number,
        required: true,
    },
});

const playerPropSchema = new mongoose.Schema({
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
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        assists: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        rebounds: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        three_point_field_goals: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        points_rebounds: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        points_assists: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
        points_rebounds_assists: {
            total: {
                type: Number,
                required: true,
            },
            books: [booksSchema],
        },
    },
});

mongoose
    .connect(
        "mongodb+srv://knighthacks17:knighthacks6900@betmate.yqz1nbu.mongodb.net/BetMate?retryWrites=true&w=majority",
        { useNewUrlParser: true, useUnifiedTopology: true }
    )
    .then()
    .catch((err) => console.error("Could not connect to MongoDB", err));

const PlayersCollection = mongoose.connection.collection("Players");
const TeamsCollection = mongoose.connection.collection("Teams");
const Props = mongoose.model("Props", playerPropSchema);

router.post("/odds/fetch-daily-player-props", async (req, res) => {
    let { date, apiKey } = req.body;
    try {
        const dailyProps = `https://api.sportradar.us/oddscomparison-player-props/trial/v2/en/sports/sr:sport:2/schedules/${date}/players_props.json?api_key=${apiKey}`;
        const response = await axios.get(dailyProps);
        const props = await parseDailyProps(response);

        res.set("Content-Type", "application/json");
        return res.status(200).send(JSON.stringify("Testing"));
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server Error");
    }
});

async function parseDailyProps(response) {
    const responseObj = response.data;

    for (const props of responseObj.players_props)
    {
        const fullName = reverseName(props.player.name);
        findPlayerByFullName(fullName);
        break;
    }
}

async function findPlayerByFullName( fullName ) {
    const nameArray = fullName.split(" ");
    const firstName = nameArray[0];
    const lastName = nameArray[nameArray.length - 1];

    PlayersCollection.findOne({ firstName: firstName, lastName: lastName}, {id: 1})
    .then((result) => {
        if (result) {
            console.log(`The id for ${firstName} ${lastName} is ${result.id}`);
        } else {
            console.log(`No player found with the name ${firstName} ${lastName}`);
        }
    })
    .catch((error) => {
        console.error(error);
    });
}

function reverseName( string ) {
    const org = string;
    const split = org.split(", ");
    const reverse = split.reverse();
    const newName = reverse.join(" ");
    return newName;
}

module.exports = router;