'use strict';

var fs = require('fs');

var store = {};

function load() {
  try {
    store = JSON.parse(fs.readFileSync('./storage.json', 'utf-8'));
  } catch (e) {
    store = {};
  }
  return store;
}

function save(store, callback) {
  fs.writeFile('./storage.json', JSON.stringify(store), callback);
}

module.exports = {
  load: load,
  save: save
};
