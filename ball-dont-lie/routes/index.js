const router = require('express').Router();

// {serverURL}/
// GET REQUEST
router.get('/', async function(req, res){
    return res.status(200).send({response: "Hello World!"});
});

module.exports = router;