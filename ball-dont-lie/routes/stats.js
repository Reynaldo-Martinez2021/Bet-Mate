const router = require('express').Router();
const apiBaseURL = require('../apiCall').statAPIBaseURL;
const apiCall = require('../apiCall').apiCall;
const getMongoCollection = require('../database').getMongoCollection;
const { env } = require('process');
const databaseName = process.env.DATABASE_NAME;
const collectionName = process.env.TEAMS_COLLECTION_NAME;
const teamsToId = require('../teams').teamsToId;
const idToTeam = require('../teams').idToTeam;

// {serverURL}/stats
// GET REQUEST
router.get('/', async function(req, res){
    return res.status(200).send({response: "Hello World!"});
});



// {serverURL}/stats/games
// Return next 10 games within the next 5 days
// GET REQUEST
router.get('/games', async function(req, res) { 
    // Gets date and formats it to YYYYMMDD format, as per requested by API
    let date = new Date();
    let start_date = date.toISOString().slice(0, 10);
    date.setDate(date.getDate()+5);
    let end_date = date.toISOString().slice(0, 10);
    let headers = {};
    let body = {
        'per_page': 50,
        'start_date': start_date,
        'end_date': end_date
    };
    let apiRes = await apiCall(apiBaseURL+"/games", "GET", headers, body);
    let data = apiRes.data;
    // Sort games by id, as that will give games in chronological order, give or take.
    data.sort((a, b) => a.id - b.id);
    data.length = (data.length > 10) ? 10 : data.length;
    let response = {
        games: data,
        length: data.length
    };
    return res.status(200).send(response);
});


// {serverURL}/stats/update/players
// Rewrites current players in database
// POST request, must give {user: "Admin"}
router.post('/update/players', async function(req, res) {
    let { user } = req.body;
    
    if (user !== "Admin")
    {
        return res.status(401).send({status: "error"});
    }

    let data = [];
    data[0] = {date: new Date()}
    // Get all players from API, many of whom are retired. Timeout of 1s per API call as limit is 60 calls a min.
    // Sorts out most retired players as retired players in API do not have a position.
    for (let i = 0; i < 100; i++) {
        let headers = {};
        let body = {
            'page': i,
            'per_page': 100
        };
        let response = await apiCall(apiBaseURL+'/players', 'GET', headers, body);
        let players = response.data;
        for (let j = 0; j < players.length; j++) {
            let player = players[j];
            if (player.position) {
                let teamName = player.team.name;
                let teamId = teamsToId[teamName];
                if (data[teamId] == undefined)
                    data[teamId] = {
                        'teamName': teamName,
                        'players': []
                    };
                data[teamId].players.push(player);
            }
        }
        if (!response.meta.next_page)
            break;
        await sleep(1000);
    }
    // Since API returns players that sometimes don't actually play for their team (ex: G-League), we will filter them out.
    // Season averages endpoint gives an accurate number of players on team so we will only add those players in the database. Since this
    // operation is run less frequent and is server-side, it makes sense to filter out the players here.
    for (let i = 1; i < data.length; i++) {
        let players = data[i].players;
        let ids = [];
        for (let j = 0; j < players.length; j++)
            ids.push(players[j].id);
        let headers = {};
        let body = {
            'player_ids': ids
        };
        let response = await apiCall(apiBaseURL+"/season_averages", "GET", headers, body);
        let responseData = response.data;
        const filter = players.filter(p2 => responseData.some(p1 => p1.player_id === p2.id))
        data[i].players = filter;
        await sleep(1000);
    }   
    // Deletes old players from database, inserts new players plus the date of when players was updated
    try {
        let collection = await getMongoCollection(databaseName, collectionName);
        await collection.deleteMany({});
        await collection.insertMany(data);
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error"});
    }
    console.log("Updated current players.");
    return res.status(200).send({status: "success"});
});

// {serverURL}/stats/averages
// Returns averages of all players in the desired team(s)
// GET request, must give {teams: []}, where 1 <= teams.length <= 8
router.get('/averages', async function(req, res) { 
    let { teams } = req.body;
    if (!Array.isArray(teams) || teams == undefined || teams.length > 8 || teams.length < 1)
        return res.status(400).send({status: "error"});
    // Looks in database for the given team(s), then returns array of players
    let findResult = [];
    try {
        let collection = await getMongoCollection(databaseName, collectionName);
        findResult = await collection.find({
            teamName: {
                $in: teams
            }
        }).toArray();
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error"});
    }
    // Looks up id for each player in team(s), as per requested by the API. The idsInfo will be used later on because API only gives ids for each player.
    let ids = [];
    let idsInfo = [];
    for (let i = 0; i < findResult.length; i++) {
        let players = findResult[i].players;
        for (let j = 0; j < players.length; j++) {
            let player = players[j];
            ids.push(player.id);
            idsInfo.push({
                id: player.id,
                team: player.team.name,
                first_name: player.first_name,
                last_name: player.last_name
            })
        }
    }
    // Gets season averages from API.
    let headers = {};
    let body = {
        'player_ids': ids
    };
    let response = await apiCall(apiBaseURL+"/season_averages", "GET", headers, body);
    let data = response.data;
    // Adds player name and team to the response.
    for (let i = 0; i < data.length; i++) {
        let player = idsInfo.find(player => player.id === data[i].player_id)
        data[i].first_name = player.first_name;
        data[i].last_name = player.last_name;
        data[i].team = player.team;
    }
    return res.status(200).send(data);
});

// {serverURL}/stats/players
// Returns all players in the desired team(s)
// GET request, must give {teams: []}, where 1 <= teams.length <= 15
router.get('/players', async function(req, res) { 
    let { teams } = req.body;
    if (!Array.isArray(teams) || teams == undefined || teams.length > 15 || teams.length < 1)
        return res.status(400).send({status: "error"});
    // Looks in database for the given team(s), then returns array of players
    let findResult = [];
    try {
        let collection = await getMongoCollection(databaseName, collectionName);
        findResult = await collection.find({
            teamName: {
                $in: teams
            }
        }).toArray();
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error"});
    }
    
    return res.status(200).send(findResult);
});


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = router;