var request = require('request');

function _authenticate(config, callback) {
  let params = {
    url: 'https://api.aidungeon.io/users',
    method: 'POST',
    json: true,
    body: {
      email: config.email,
      password: config.password
    }
  }

  request(params, function(err, response, body) {
    if (response.statusCode !== 200) return callback(new Error('Non 200 response' + JSON.stringify(body)));
    else callback(err, body);
  });
}

module.exports.startSession = startSession;

function startSession(storyMode, characterType, name, config, callback) {

  _authenticate(config, function(err, data) {
    if (err) callback(err);
    else {
      let params = {
        url: 'https://api.aidungeon.io/sessions',
        method: 'POST',
        json: true,
        headers: {
          'x-access-token': data.accessToken
        },
        body: {
          storyMode: storyMode,
          name: name,
          characterType: characterType
        }
      }

      request(params, function(err, response, body) {
        if (response.statusCode !== 200) return callback(new Error('Non 200 response', JSON.stringify(body)));
        else callback(err, body);
      });
    }
  });
}

module.exports.input = input;

function input(sessionId, input, config, callback) {

  _authenticate(config, function(err, data) {
    if (err) callback(err);
    else {
      let params = {
        url: `https://api.aidungeon.io/sessions/${sessionId}/inputs`,
        method: 'POST',
        json: true,
        headers: {
          'x-access-token': data.accessToken
        },
        body: {
          text: input
        }
      }

      request(params, function(err, response, body) {
        if (response.statusCode !== 200) return callback(new Error('Non 200 response', JSON.stringify(body)));
        else callback(err, body);
      });
    }
  });
}

module.exports.getStory = getStory;

function getStory(publicStoryId, config, callback) {

  _authenticate(config, function(err, data) {
    if (err) callback(err);
    else {
      let params = {
        url: `https://api.aidungeon.io/stories/${publicStoryId}`,
        method: 'GET',
        json: true,
        headers: {
          'x-access-token': data.accessToken
        }
      }

      request(params, function(err, response, body) {
        if (response.statusCode !== 200) return callback(new Error('Non 200 response', JSON.stringify(body)));
        else callback(err, body);
      });
    }
  });
}