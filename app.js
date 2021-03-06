var api = require('./api.js');
var config = require('./config.json');

var fs = require('fs');

const Discord = require('discord.js');
const bot = new Discord.Client();
var auth = require('./auth.json');

const validStoryTypes = ['fantasy', 'mystery', 'apocalyptic', 'zombies'];
const validCharacterTypes = {
  fantasy: ['noble', 'knight', 'squire', 'wizard', 'ranger', 'peasant', 'rogue'],
  mystery: ['patient', 'detective', 'spy'],
  apocalyptic: ['soldier', 'scavenger', 'survivor', 'courier'],
  zombies: ['soldier', 'survivor', 'scientist']
};

bot.login(auth.token);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', message => {
  if (message && (message.author === bot.user || message.author.bot || !message.guild)) return;
  if (message && message.guild && message.guild.id) {
    let guildId = message.guild.id;
    if (message && message.content && message.content === '!aidungeonsetchannel') {
      message.channel.send('Only listening to ai dungeon inputs on channel');
      _saveChannel(message);
    }
    else if (message && message.content && message.content === '!newstory') {
      if (_correctChannel(message)) _initiateStory(message);
      else message.channel.send('This is not the correct channel');
    }
    else if (message && message.content && message.content === '!liststories') {
      if (_correctChannel(message)) _listStories(message);
      else message.channel.send('This is not the correct channel');
    }
    else if (message && message.content && message.content.startsWith('!getstory')) {
      if (_correctChannel(message)) _getStory(message);
      else message.channel.send('This is not the correct channel');
    }
    else if (_correctChannel(message) && _isInitiatingStory(message)) {
      _setStoryVariable(message);
    }
    else if (_correctChannel(message) && _isInputtingStory(message)) {
      _input(message);
    }
  }
});

function _getStory(message) {
  let storyId;

  if (message && message.content && message.content.split(' ').length > 1) {
    let storyId = message.content.split(' ')[1];
    api.getStory(storyId, config, function(err, body) {
      if (err) console.error(err);
      else {
        if (body && body.story) {
          let output = 'Story: ' + storyId + '\n';
          body.story.forEach(function(row) {
            if (row && row.type === 'output') {
              output += row.value + '\n';
            }
            else if (row && row.type === 'input') {
              output += '> ' + row.value + '\n';
            }
          });
          message.author.send(output);
        }
        else message.channel.send('Unable to find story');
      }
    });
  }
  else message.channel.send('Syntaxt: `!getstory <id>`');
}

function _listStories(message) {
  let session = require('./session.json');
  if (session && session[message.guild.id] && session[message.guild.id].publicStoryIds) {
    let publicStoryIds = session[message.guild.id].publicStoryIds || [];
    publicStoryIds.forEach(function(obj) {
      let outputEmbed = new Discord.RichEmbed().setColor('#0099ff');
      outputEmbed.addField('ID', obj.publicId);
      outputEmbed.addField('Date', obj.createdAt);
      outputEmbed.addField('Story', obj.storyStart.substring(0, 200) + '...');
      message.author.send(outputEmbed);
    });
    message.channel.send('Sent a list of stories in PM. To get a full story, type `!getstory <id>`');
  }
  else message.channel.send('No stories found');
}

function _input(message) {
  let session = require('./session.json');
  if (session && session[message.guild.id] && session[message.guild.id].storySession && session[message.guild.id].storySession.id) {
    let storyId = session[message.guild.id].storySession.id
    let text = message.content;
    if (text === '...') text = '';
    api.input(storyId, text, config, function(err, story) {
      if (err) console.error(err);
      else {
        session[message.guild.id].storySession.story = story;
        _saveSession(session);
        _outputRecentMessage(message);
        if (_checkForEnding(message)) {
          session[message.guild.id].waitingOnInputs = false;
          message.channel.send('Story is finished. If you wish to play again type `!newstory`');
        }
      }
    });
  }
  else console.error('Inputting story but guild has no story session active!');
}

function _setStoryVariable(message) {
  let session = require('./session.json');
  if (session[message.guild.id].waitingOnStoryType) {
    //Expecting a story type
    let input = message.content.toLowerCase();
    if (Object.keys(validCharacterTypes).indexOf(input) > -1) {
      session[message.guild.id].waitingOnStoryType = false;
      session[message.guild.id].storyType = input;
      session[message.guild.id].waitingOnCharacterType = true;
      _saveSession(session);
      let outputString = 'Pick a character!\n\n';
      validCharacterTypes[input].forEach(function(character) {
        outputString+= character + '\n';
      });
      message.channel.send(outputString);
    }
    else message.channel.send(message.content + ' is not a valid story type');
  }
  else if (session[message.guild.id].waitingOnCharacterType) {
    //Expecting a character type
    let input = message.content.toLowerCase();
    if (validCharacterTypes[session[message.guild.id].storyType].indexOf(input) > -1) {
      session[message.guild.id].waitingOnCharacterType = false;
      session[message.guild.id].characterType = input;
      session[message.guild.id].waitingOnName = true;
      _saveSession(session);
      message.channel.send('Choose a name!');
    }
    else message.channel.send(message.content + ' is not a valid story type');
  }
  else if (session[message.guild.id].waitingOnName) {
    //Expecting a character type
    let input = message.content;
    session[message.guild.id].waitingOnCharacterType = false;
    session[message.guild.id].name = input;
    session[message.guild.id].initiatingStory = false;
    _saveSession(session);
    message.channel.send('Generating story...');
    api.startSession(session[message.guild.id].storyType, session[message.guild.id].characterType, session[message.guild.id].name, config, function(err, storySession) {
      if (err) console.error(err);
      else {
        session[message.guild.id].storySession = storySession;
        session[message.guild.id].waitingOnInputs = true;
        let publicStoryIds = session[message.guild.id].publicStoryIds || [];
        publicStoryIds.push({publicId: storySession.publicId, createdAt: storySession.createdAt, storyStart: storySession.story[0].value});
        session[message.guild.id].publicStoryIds = publicStoryIds;
        _saveSession(session);
        _outputRecentMessage(message);
      }
    })
  }
}

function _checkForEnding(message) {
  let session = require('./session.json');
  let story = session[message.guild.id].storySession.story;
  let isFinished = false;
  story.forEach(function(messages) {
    if (messages && messages.conclusion) {
      isFinished = true;
    }
  });
  return isFinished;
}

function _outputRecentMessage(message) {
  let session = require('./session.json');
  let story = session[message.guild.id].storySession.story;
  let lastMessage = story[story.length - 1];
  if (lastMessage && lastMessage.type === 'output' && lastMessage.value) {
    message.channel.send(lastMessage.value);
  }
  else message.channel.send('Unable to parse response');
}

function _initiateStory(message) {
  let session = require('./session.json');
  session[message.guild.id].initiatingStory = true;
  session[message.guild.id].waitingOnStoryType = true;
  _saveSession(session);
  let outputString = 'Pick a setting!\n\n';  
  Object.keys(validCharacterTypes).forEach(function(storyType) {
    outputString+= storyType + '\n';
  });
  message.channel.send(outputString);
}

function _isInputtingStory(message) {
  let session = require('./session.json');
  return session[message.guild.id].waitingOnInputs;
}

function _isInitiatingStory(message) {
  let session = require('./session.json');
  return session[message.guild.id].initiatingStory;
}

function _correctChannel(message) {
  let session = require('./session.json');
  return session && session[message.guild.id] && session[message.guild.id].channelId === message.channel.id;
}

function _saveChannel(message) {
  let session = require('./session.json');
  session = session || {};
  session[message.guild.id] = {
    channelId: message.channel.id
  }
  fs.writeFileSync('./session.json', JSON.stringify(session));
}

function _saveSession(session) {
  fs.writeFileSync('./session.json', JSON.stringify(session));
}

function _saveStory(story, callback) {
  let session = require('./session.json');
  if (session) session.story = story;
  else return callback(new Error('Unable to find session'));

  fs.writeFile('./session.json', JSON.stringify(session), callback);
}