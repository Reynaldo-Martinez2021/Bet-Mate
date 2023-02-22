const router = require('express').Router();

// {serverURL}/
// GET REQUEST
router.get('/', async function(req, res){
    return res.status(200).send({response: "Hello World!"});
});

module.exports = router;

/*
    const router = require('express').Router();
        - requires the `Router` module from Express and creates a new instance of a router

    router.get('/', async function(req, res){
        
    });
        - defines a new GET route that will handle request to the root URL (`/`)
        - second argument is an anonymous function that will be called when a request is made
        to the route
            - function takes two arguments:
                - `req`: request object
                - `res`: response object

    
    return res.status(200).send({response: "Hello World!"});
        - sends a JSON response to the client with a `response` key and the string
        `"Hello World!"` as its value
        - the response is sent with an HTTP status code of 200, indicating that the request
        was successful

    module.exports = router;
        - exports the `router` object so that it can be used in other parts of the application

*/