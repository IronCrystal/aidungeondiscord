var request = require('request');

module.exports.startSession = startSession;

function startSession(storyMode, characterType, name, callback) {

  let params = {
    url: 'https://api.aidungeon.io/sessions',
    method: 'POST',
    json: true,
    headers: {
      'x-access-token': '461d60a0-1f95-11ea-905d-efc0ed33e2a2' //Hardcoded for some reason? The web browser always uses this regardless of session
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

module.exports.input = input;

function input(sessionId, input, callback) {
  let params = {
    url: `https://api.aidungeon.io/sessions/${sessionId}/inputs`,
    method: 'POST',
    json: true,
    headers: {
      'x-access-token': '461d60a0-1f95-11ea-905d-efc0ed33e2a2' //Hardcoded for some reason? The web browser always uses this regardless of session
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

module.exports.getStory = getStory;

function getStory(publicStoryId, callback) {
  let params = {
    url: `https://api.aidungeon.io/stories/${publicStoryId}`,
    method: 'GET',
    json: true,
    headers: {
      'x-access-token': '461d60a0-1f95-11ea-905d-efc0ed33e2a2' //Hardcoded for some reason? The web browser always uses this regardless of session
    }
  }

  request(params, function(err, response, body) {
    if (response.statusCode !== 200) return callback(new Error('Non 200 response', JSON.stringify(body)));
    else callback(err, body);
  });
}