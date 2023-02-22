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


/*
    this file sets an express web server with two routes and applies middleware for
    rate limiting and CORS

    const express = require('express');
    const cors = require('cors');
    const { env } = require('process');
    require('dotenv').config();
    const rateLimit = require('express-rate-limit');
        - imports the required dependencies for the application, including the `express` framework, 
        the `cors` package for handling Cross-Origin Resource sharing (CORS) requests, 
        the `process.env` object to access enviroment variables and `express-rate-limit` for rate limiting

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
        - sets up the application with the necessary middleware and config.
        - `app` object is initialized as an instance of `express` framework
        - `limit` variable sets up rate limiting with a maximum of 30 requests per minute
        - `app.use(limit)` statement applies the rate limiting middleware to all routes
        - `app.set('trust proxy', 1)` statement tells Express to trust the proxy
            - if the application is behind a reverse proxy to correctly report the 
            clients IP address
        - `app.use(cors())` statement applies CORS middleware to all routes, which allows
        the application to accept request from other domains
        - `app.use(express.json())` enables JSON body parsing for incoming request

    const indexRoutes = require('./routes/index');
    const statRoutes = require('./routes/stats');
        - imports two route files we have configured

    app.listen(port, function () {
        console.log(`Running on port ${port}`);
    });
        - starts the serve and listens for incoming requests on the specified port


    What is CORS and why is it used?
        - Cross-Origin Resource Sharing (CORS) is a mechanism that allows web servers
        to specifiy which domains are allowed to access the server's resources such as files,
        data, or services
        
        - By default, web browsers enforce a same-origin policy, which means that a web page can only 
        make requests to resources on the same domain as the web page. This is a security measure to
        prevent malicious websites from accessing sensitive data on other websites.

        - CORS allows web servers to relax the same-origin policy and selectively allow requests from specified 
        domains or origins. The `cors` package provides middleware that can be used to enable CORS for an express
        web server.
    
    What is middleware?
        - is a function that sits between the client and the server and has access to the request
        and response objects. It can manipulate the request and response objects and perform various tasks
        such as authentication, logging, error handling, parsing the request body, and modifying the response

        -  The cors middleware has various options that can be used to customize its behavior, such as specifying 
        which domains are allowed to access the server's resources, setting allowed methods, headers, and more.
    
    What is rate limiting and what is it used for?
        - is a technique used to limit the number of request that can be made to a server or an API in a given time.
        The purpose of rate limiting is to prevent overloading the server or API, which can cause performace issues
        or downtime

        -  By limiting the number of requests, API providers can ensure fair usage and improve the reliability and 
        availability of their services. Rate limiting can also be used to protect against malicious attacks, such as 
        DDoS attacks, which can overload the server with a large number of requests.

    What does app.set('trust proxy',1) do exactly?
        - this is a method call in an Express app to indicate that the application is running behind a reverse
        proxy or a load balancer.

        - when an Express app is deployed behind a reverse proxy or a load balancer, the IP address of the client
        making the request is no longer visible to the application. Instead, the IP address of the proxy is used as
        the source IP address for the requests.

        - when `app.set('trust proxy', 1)` method is called, Express will trust the `X-Forwarded-For` header, which is
        added by the reverse proxy, and use the IP address from this header as the source IP for the request

        - setting `trust proxy` to `1` tells Express to trust the first IP address in the `X-Forwarded-For` header, which 
        is the IP address of the client making the request.

        - by using `trust proxy` you can ensure that your application accurately records the IP address of the client
        making the request, even when the application is running behind a reverse proxy
            - this can be useful for logging, security, and other issues
*/