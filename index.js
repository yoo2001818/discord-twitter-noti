'use strict';

var Twitter = require('twitter');
var Discord = require('discord.io');
var config = require('./config.js');
var storage = require('./storage.js');

var discord = new Discord.Client({
    autorun: true,
    token: config.discord.token
});
var twitter = new Twitter(config.twitter);

var store = storage.load();
var stream = null;
var counterGoing = false;

discord.on('ready', function(event) {
    console.log('Logged in as %s - %s\n', discord.username, discord.id);
    connectStream();
});

discord.on('message', function (user, userID, channelID, message, event) {
  let args = message.split(/\s+/g);
  if (args[0] === '!follow' || args[0] === '!unfollow') {
    discord.simulateTyping(channelID);
    twitter.get('users/show', {screen_name: args[1]}, function (error, data) {
      if (error) {
        console.log(error);
        discord.sendMessage({
          to: channelID,
          message: '불러오기에 실패했습니다.'
        });
        return;
      }
      let channel = discord.channels[channelID];
      let userSubscribers = store[data.id_str];
      if (userSubscribers == null) {
        userSubscribers = store[data.id_str] = [];
      }
      if (args[0] === '!follow') {
        if (userSubscribers.indexOf(channelID) !== -1) {
          discord.sendMessage({
            to: channelID,
            message: `${data.name}님은 이미 #${channel.name}에 팔로우되어 있습니다.`
          });
          return;
        }
        userSubscribers.push(channelID);
        storage.save(store);
        discord.sendMessage({
          to: channelID,
          message: `#${channel.name}에 ${data.name}님을 팔로우합니다.`
        });
      } else if (args[0] === '!unfollow') {
        if (userSubscribers.indexOf(channelID) === -1) {
          discord.sendMessage({
            to: channelID,
            message: `${data.name}님은 #${channel.name}에 팔로우되어 있지 않습니다.`
          });
          return;
        }
        userSubscribers.splice(userSubscribers.indexOf(channelID), 1);
        if (userSubscribers.length === 0) {
          delete store[data.id_str];
        }
        storage.save(store);
        discord.sendMessage({
          to: channelID,
          message: `#${channel.name}에 ${data.name}님을 언팔로우 했습니다.`
        });
      }
      connectStream();
    });
  }
});

function connectStream() {
  if (stream != null) {
    stream.destroy();
    stream = null;
    counterGoing = true;
    setTimeout(function() {
      counterGoing = false;
      connectStream();
    }, 5000);
    return;
  }
  if (counterGoing) return;
  console.log(Object.keys(store).join(','));
  twitter.stream('statuses/filter', {follow: Object.keys(store).join(',')},
  function (_stream) {
    stream = _stream;
    stream.on('data', function(event) {
      if (event.user == null) return;
      let msg = `@${event.user.screen_name}: ${event.text} ` +
        `http://twitter.com/${event.user.screen_name}/status/${event.id_str}`;
      console.log(msg);
      let channels = store[event.user.id_str];
      if (channels == null) return;
      channels.forEach(channelID => {
        discord.sendMessage({
          to: channelID,
          message: msg
        });
      });
    });
    stream.on('error', function(error) {
      throw error;
    });
  });
}
