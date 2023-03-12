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

// {serverURL}/login/
// GET REQUEST
router.get('/', async function(req, res) {
    return res.status(200).send({response: "Hello World!"});
});

// {serverURL}/login/new_user
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/new_user', async function(req, res) {
    let { username, password, email } = req.body;
    if (!username || !password || !email)
        return res.status(400).send({status: "error", reason: "Body must contain username, password, and email"});
    if (!isValidUsername(username) || !isValidPassword(password) || !isValidEmail(email))
        return res.status(400).send({status: "error", reason: "Invalid username, password, or email"});
    try {
        let findResult = await UsersCollection.findOne({username: username})
        if (findResult != null)
            return res.status(403).send({status: "error", reason: "User already exists"});
        findResult = await UsersCollection.findOne({email: email})
        if (findResult != null)
            return res.status(403).send({status: "error", reason: "Email already exists"});
    } catch {
        return res.status(500).send({status: "error", reason: "Server Error"});
    }
    let response = {
        username: username
    };
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 256, 32, 'sha256').toString('hex');
    const date_created = new Date();
    const access_token = jwt.sign(response, process.env.ACCESS_TOKEN_SECRET);
    let newUser = new User({
        '_id': new ObjectId(),
        username: username,
        password: hash,
        email: email,
        verified: false,
        salt: salt,
        access_token: access_token,
        date_created: date_created,
        last_login: date_created,
        admin: false
    }, { collection: UsersCollectionName });

    try {
        await newUser.save();
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error", reason: "Server Error"});
    } 

    response.email = email;
    response.status = "success";
    return res.status(200).send(response);
});

// {serverURL}/login/returning_user
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/returning_user', async function(req, res) {
    let { username, password } = req.body;
    if (!username || !password)
        return res.status(400).send({status: "error", reason: "Body must contain username and password"});
    if (!isValidPassword(password))
        return res.status(400).send({status: "error", reason: "Invalid password"});
    let query;
    if (isValidEmail(username)) 
        query = "email";
    else if (isValidUsername(username))
        query = "username";
    else 
        return res.status(400).send({status: "error", reason: "Invalid username / email"});
    let findResult;
    try {
        findResult = await UsersCollection.findOne({[query]: username});
        if (findResult == null)
            return res.status(400).send({status: "error", reason: "User does not exist"});
    } catch {
        return res.status(500).send({status: "error", reason: "Server error"});
    }
    let response = {
        username: username
    };
    try {
        const hash = crypto.pbkdf2Sync(password, findResult.salt, 256, 32, 'sha256').toString('hex');
        if (hash.length != findResult.password.length)
            return res.status(403).send({status: "error", reason: "Incorrect password"});
        for (let i = 0; i < hash.length; i++)
            if (hash.charAt(i) !== findResult.password.charAt(i)) 
                return res.status(403).send({status: "error", reason: "Incorrect password"});
        const access_token = jwt.sign({username: username}, process.env.ACCESS_TOKEN_SECRET);
        await UsersCollection.findOneAndUpdate({[query]: username}, {$set: {access_token: access_token, last_login: new Date()}}, {upsert: true});
        response.access_token = access_token;
    } catch (error) {
        console.log(error);
        return res.status(500).send({status: "error", reason: "Server error"});
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

// {serverURL}/login/forgot_password
// '$' Not allowed in username or email for security reasons
// PUT REQUEST
router.put('/forgot_password', async function(req, res) {
    return res.status(200).send({response: "Hello World!"});
})

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
    if (password.length < 5 && password.length > 30)
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