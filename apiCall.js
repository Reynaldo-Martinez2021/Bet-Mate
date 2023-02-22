const { JSDOM } = require("jsdom");
const { window } = new JSDOM("");
const $ = require("jquery")(window);
const statAPIBaseURL = "https://www.balldontlie.io/api/v1";

// jQuery function for making API Calls
async function apiCall(url, type, headers, body) {
  return await $.ajax({
    url: url,
    type: type,
    data: body,
    headers: headers,
    success: function (response) {
      return response;
    },
    error: function (error) {
      return error;
    },
  });
}

exports.apiCall = apiCall;
exports.statAPIBaseURL = statAPIBaseURL;

/*
  const {JSDOM} = require("jsdom");
  const {window} = new JSDOM("");
  const $ = require("jquery")(window); 
    - first three lines import the necessary libraries and create a new JSDOM object
    with an empty string to create a new window object.
      - this is necessary to allow jQuery to work in a Node.js environment

    - `$` is then set to a new instance of jQuery, using the `window` object created
    by JSDOM

  async function apiCall()
    - function is a wrapper around jQuery AJAX method that makes it easier for API calls
    - the four parameters:
      - `url`: the url to make the api call
      - `type`: the HTTP method to use (GET, POST, DELETE, etc)
      - `header`: an object containing any headers to include in the request

    - the function then returns the result of the result of the AJAX call, wrapped
    in a Promise using the `async` keyword. It also handles both success and error 
    responses, returning the response or error object


  What is exports?
    - `exports` object is used to define what properties or methods of a module should 
    be made avaiable to other modules that require it

    - when a module is imported into another module using the `require()` function,
    the object that is returned is essentially the `exports` object of the imported
    module
*/
