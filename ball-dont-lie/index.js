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
    max:30
});

app.use(limit);
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Import routes
const indexRoutes = require('./routes/index');
const statRoutes = require('./routes/stats');


// Use routes
app.use('/', indexRoutes);
app.use('/stats', statRoutes);


app.listen(port, function () {
    console.log(`Running on port ${port}`);
});