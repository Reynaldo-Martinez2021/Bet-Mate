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
