const router = require("express").Router();
const mongoose = require("mongoose");
const { env } = require('process');
const UsersCollection = require("../database").UsersCollection;
const User = require('../database').User;
const crypto = require('crypto');
const { ObjectId } = require("mongodb");
const UsersCollectionName = require("../database").USERS_COLLECTION_NAME;
const jwt = require("jsonwebtoken");
const { access } = require("fs");
const emailer = require('../nodemailer').transporter;
const EMAIL_USERNAME = require('../nodemailer').EMAIL_USERNAME;
const BETMATE_BACKEND_HOME_PAGE = process.env.BETMATE_BACKEND_HOME_PAGE;
const BETMATE_HOME_PAGE = process.env.BETMATE_HOME_PAGE;

// {serverURL}/login/
// GET REQUEST
router.get('/', async function(req, res) {
    return res.status(200).send({response: "Hello World!"});
});

// {serverURL}/login/new_user
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/new_user', async function(req, res) {
    const { username, password, email } = req.body;
    if (!username || !password || !email)
        return res.status(400).send({status: "error", reason: "Body must contain username, password, and email"});
    // Loosely checks if username, password, email are valid with no crazy shenanigans
    if (!isValidUsername(username) || !isValidPassword(password) || !isValidEmail(email))
        return res.status(406).send({status: "error", reason: "Invalid username, password, or email"});
    try {
        // Username and email must both be unique
        let findResult = await UsersCollection.findOne({username: username})
        if (findResult != null)
            return res.status(406).send({status: "error", reason: "User already exists"});
        findResult = await UsersCollection.findOne({email: email})
        if (findResult != null)
            return res.status(406).send({status: "error", reason: "Email already exists"});
    } catch {
        return res.status(500).send({status: "error", reason: "Server Error"});
    }
    // Salt -> Small string to append to password so that a commonly used password won't have the same hash in case of data breach
    const salt = crypto.randomBytes(32).toString('hex');
    // Hash given password with SHA-256 to be stored in database
    const hash = hashPassword(password, salt);
    const date_created = new Date();
    // New user schema with Mongoose to be added to Users Collection
    let newUser = new User({
        '_id': new ObjectId(),
        username: username,
        password: hash,
        email: email,
        verified: false,
        salt: salt,
        date_created: date_created,
        admin: false
    }, { collection: UsersCollectionName });
    // Save the new user to database
    try {
        await newUser.save();
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error", reason: "Server Error"});
    } 
    // Creates a response JSON to be sent back with username, refresh token, and access token
    let response = newLogin(username);
    if (!response) 
        return res.status(500).send({status: "error", reason: "Server error"});
    response.email = email;
    response.status = "success";
    // Email user that an account has been created under their email
    // FIXME -> Create an email verification system?
    const emailOptions = {
        from: EMAIL_USERNAME,
        to: email,
        subject: 'BetMate Account Created Successfully',
        html: '<h2>Your BetMate Account was created successfully: </h2>'+
        `<h3>Username: ${username}</h3>`
    };
    emailer.sendMail(emailOptions);
    return res.status(200).send(response);
});

// {serverURL}/login/returning_user
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/returning_user', async function(req, res) {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).send({status: "error", reason: "Body must contain username and password"});
    // Loosely checks if password is valid with no crazy shenanigans.
    if (!isValidPassword(password))
        return res.status(406).send({status: "error", reason: "Invalid password"});
    // If username given has characteristics of an email, we will look for a matching email in database, likewise username.
    let query;
    if (isValidEmail(username)) 
        query = "email";
    else if (isValidUsername(username))
        query = "username";
    else 
        return res.status(406).send({status: "error", reason: "Invalid username / email"});
    let findResult;
    try {
        findResult = await UsersCollection.findOne({[query]: username});
    } catch {
        return res.status(500).send({status: "error", reason: "Server error"});
    }
    if (findResult == null)
        return res.status(406).send({status: "error", reason: "User does not exist"});
    // Hash password given to us and compare the hashed password stored in database to see if they match.
    // Creates a response JSON to be sent back with username, refresh token, and access token
    let response;
    try {
        const hash = hashPassword(password, findResult.salt);
        if (hash.length != findResult.password.length)
            return res.status(401).send({status: "error", reason: "Incorrect password"});
        for (let i = 0; i < hash.length; i++)
            if (hash.charAt(i) !== findResult.password.charAt(i)) 
                return res.status(401).send({status: "error", reason: "Incorrect password"});
        response = newLogin(username);
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error", reason: "Server error"});
    }
    if (!response)
        return res.status(500).send({status: "error", reason: "Server error"});
    response.status = "success";
    return res.status(200).send(response);
});

// Generates a new access token that will expire in one hour if they give a valid refresh token.
// {serverURL}/login/refresh_token
// GET REQUEST
router.get('/refresh_token', async function(req, res) {
    const { authorization } = req.headers;
    const { username } = req.body;
    if (!authorization) 
        return res.status(400).send({status: "error", reason: "Must provide refresh token in headers"});
    if (!username)
        return res.status(400).send({status: "error", reason: "Must provide username in body"});
    // Loosely checks if username is valid with no crazy shenanigans.
    if (!isValidUsername(username))
        return res.status(406).send({status: "error", reason: "Invalid username"});
    // Creates a response JSON to be sent back with username, and new access token token
    let response = {
        username: username
    };
    try {
        // User will send as header: "Bearer <refresh_token>". Thus, we will split at the space to get their refresh token.
        const refresh_token = authorization.split(" ")[1];
        const access_token = getAccessToken(username, refresh_token);
        if (!access_token)
            return res.status(401).send({status: "error", reason: "Invalid refresh token"});
        const time = Date.now();
        response.access_token = {
            token: access_token,
            expires_in: time+3600*1000 // 60 minutes
        };
    } catch {
        return res.status(401).send({status: "error", reason: "Invalid refresh token"});
    }
    response.status = "success";
    return res.status(200).send(response);
});

// {serverURL}/login/logout
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/logout', async function(req, res) {
    return res.status(200).send({response: "Hello World!"});
});

// Sends an email to given email address to reset password, if user exists in database.
// {serverURL}/login/forgot_password
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/forgot_password', async function(req, res) {
    const { email } = req.body;
    if (!email) 
        return res.status(400).send({status: "error", reason: "Must provide email"});
    // Loosely checks if email is valid with no crazy shenanigans.
    if (!isValidEmail(email))
        return res.status(406).send({status: "error", reason: "Invalid email"});
    // Try to find a matching email in the database.
    let findResult;
    try {
        findResult = await UsersCollection.findOne({email: email});
    } catch {
        return res.status(500).send({status: "error", reason: "Server error"});
    }
    if (findResult == null)
        return res.status(406).send({status: "error", reason: "User does not exist"});
    // Send an email with NodeMailer with an access token that will expire in a hour.
    // Redirect link will be a link to the BetMate website, not the backend server.
    // Will need a webpage in the frontend that will handle this request and send the desired updated password:
    // {betmateURL}/forgot_password?username=<username>&access_token=<access_token>
    const username = findResult.username;
    const accessToken = getAccessToken(username, getRefreshToken(username));
    const redirectLink = `${BETMATE_HOME_PAGE}/forgot_password.html?username=${username}&access_token=${accessToken}`;
    const emailOptions = {
        from: EMAIL_USERNAME,
        to: email,
        subject: 'Reset your BetMate password',
        html: '<h2>Click here to reset your password: </h2>'+
            `<form action="${redirectLink}"><input type="submit" value="Reset Password"></form>`+
            '<div>This link will expire in one hour.</div>'+
            '<div>If you did not request this, you can ignore this email.</div>'+
            '<div>Do not share contents of this page.</div>'+
            '<h3 style="margin-top: 15px;">Alternatively, you can click on this link to reset the password: </h3>'+
            `<a href="${redirectLink}">${redirectLink}</a>`
    };
    emailer.sendMail(emailOptions, function(error, info) {
        if (error) 
            return res.status(500).send({status: "error", reason: "Server error"});
    });
    return res.status(200).send({status: "success", email: email});
});

// {serverURL}/login/forgot_password/:username/:access_token
// '$' Not allowed in username for security reasons
// PUT REQUEST
router.put('/forgot_password/:username/:access_token', async function(req, res) {
    const { username, access_token } = req.params;
    const { password } = req.body;
    console.log(req.params)
    console.log(req.body)
    if (!username || !access_token || !password)
        return res.status(400).send({status: "error", reason: "Must provide username, access_token, and password"});
    // Loosely checks if username and email are valid with no crazy shenanigans.
    if (!isValidUsername(username))
        return res.status(406).send({status: "error", reason: "Invalid username"});
    if (!isValidPassword(password))
        return res.status(406).send({status: "error", reason: "Invalid password"});
    // Checks if the access token is valid for the user and unexpired. 
    // If it isn't, jwt will throw an error that will be handled by giving an error as the JSON response.
    try {
        jwt.verify(access_token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        return res.status(401).send({status: "error", reason: "Invalid access token"});
    }
    // Try to find a matching username in database.
    // Hash given password with SHA-256 to be stored in database
    // Update password where the username matches given username
    try {
        findResult = await UsersCollection.findOne({username: username});
        if (findResult == null)
            return res.status(406).send({status: "error", reason: "User does not exist"});
        const hash = hashPassword(password, findResult.salt);
        await UsersCollection.findOneAndUpdate({username: username}, {$set: {password: hash}}, {upsert: true});
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error", reason: "Server error"});
    }
    // Creates a response JSON to be sent back with username, refresh token, and access token
    let response = newLogin(username);
    if (!response) 
        return res.status(500).send({status: "error", reason: "Server error"});
    response.status = "success";
    // Sends an email to user that their password was been successfully changed
    const emailOptions = {
        from: EMAIL_USERNAME,
        to: findResult.email,
        subject: 'Your BetMate password was reset',
        html: '<h2>Your BetMate password was changed. </h2>'+
            "If it wasn't you, you should change your password promptly."
    };
    emailer.sendMail(emailOptions);
    return res.status(200).send(response);
});

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 256, 32, 'sha256').toString('hex');
}

// Refresh tokens last 30 days, will need to re-login after.
function getRefreshToken(username) {
    const user = {
        username: username
    };
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '30d'});
    return refreshToken;
}

// Access tokens will expire in about an hour, and will need to be refreshed with a given valid refresh token.
function getAccessToken(username, refreshToken) {
    const user = {
        username: username
    };
    const validRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (validRefreshToken) {
        return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '61m'});
    }
    return null;
}

function newLogin(username) {
    let response = {
        username: username
    };
    const refreshToken = getRefreshToken(username);
    if (!refreshToken)
        return null;
    const time = Date.now();
    const accessToken = getAccessToken(username, refreshToken);
    const response_access_token = {
        token: accessToken,
        expires_in: time+3600*1000 // 60 minutes
    };
    const response_refresh_token = {
        token: refreshToken,
        expires_in: time+3600*1000*24*30 // 30 days
    }
    response.access_token = response_access_token;
    response.refresh_token = response_refresh_token;
    response.time = time;
    return response;
}

function isValidUsername(username) {
    if (typeof username !== 'string')
        return false;
    if (username.length < 5 || username.length > 20)
        return false;
    for (let i = 0; i < username.length; i++) {
        const ch = username.charAt(i);
        if (ch >= 'a' && ch <= 'z')
            continue;
        if (ch >= 'A' && ch <= 'Z')
            continue;
        if (ch >= '0' && ch <= '9')
            continue;
        if (ch == '-' || ch == '_')
            continue;
        return false;
    }
    return true;
}

function isValidPassword(password) {
    if (typeof password !== 'string')
        return false;
    if (password.length < 5 || password.length > 30)
        return false;
    for (let i = 0; i < password.length; i++) {
        const ch = password.charAt(i);
        if (ch >= ' ' && ch <= '~')
            continue;
        return false;
    }
    return true;
}

function isValidEmail(email) {
    if (typeof email !== 'string')
        return false;
    if (email.length < 5 || email.length > 100)
        return false;
    let i = 0;
    for (; i < email.length; i++) {
        const ch = email.charAt(i);
        if (ch == '@')
            break;
        if (ch == '$')
            return false;
    }
    i += 2;
    for (; i < email.length; i++) {
        const ch = email.charAt(i);
        if (ch == '@' || ch == '$')
            return false;
        if (ch == '.')
            break;
    }
    i++;
    for (; i < email.length; i++) {
        const ch = email.charAt(i);
        if (ch == '$')
            return false;
        if (i == email.length-1)
            return true;
    }
    return false;
}

module.exports = router;