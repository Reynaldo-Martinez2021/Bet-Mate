// Import dependencies 
const express = require('express');
const cors = require('cors');
const { env } = require('process');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

// Use dependencies
const port = process.env.PORT || 8080;

const app = express();
const limit = rateLimit({
    windowsMs: 1*60*1000,
    max:30 // 30 per min
});

const loginLimit = rateLimit({
    windowsMs: 30*1000,
    max: 5 // 5 per 30 seconds
})

app.use(limit);
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Import routes
const getTeamsRoutes = require('./routes/teams');
const getPlayersRoutes = require('./routes/players');
const getScheduleRoutes = require('./routes/schedule');
const getGamesRoutes = require('./routes/games');
const getOddsRoutes = require('./routes/odds');
const loginRoutes = require('./routes/login');

// Use routes
app.use('/', getTeamsRoutes);
app.use('/', getPlayersRoutes);
app.use('/', getScheduleRoutes);
app.use('/', getGamesRoutes);
app.use('/', getOddsRoutes);
app.use('/login', loginLimit);
app.use('/login', loginRoutes);

app.listen(port, function () {
    console.log(`Running on port ${port}`);
});