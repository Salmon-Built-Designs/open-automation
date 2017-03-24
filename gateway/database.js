
module.exports = {
  set_wifi_from_db: set_wifi_from_db,
  get_devices: get_devices,
  get_settings: get_settings,  
  store_settings: store_settings,
  store_device: store_device
}

//module.exports.relay_server = "127.0.0.1";

module.exports.relay_server = "98.168.142.41:5000";
module.exports.video_relay_server = "98.168.142.41";

//module.exports.relay_server = "70.175.160.122:80";
//module.exports.video_relay_server = "70.175.160.122";

var connection = require('./connection.js');
var socket = require('./socket.js');
var utils = require('../utils.js');
var mongodb = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var MongoClient = mongodb.MongoClient;
var settings = {};

get_devices();
get_settings();
var got_token = false;
//-- initialize variables --//

function set_wifi_from_db() {
  console.log("set_wifi_from_db");
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      var collection = db.collection('settings');
      collection.find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
  	  settings_obj = result[0];
  	  connection.set_wifi(settings_obj);
 	  //console.log('initialize variables | ',settings_obj);
        } else {
          console.log('No document(s) found with defined "find" criteria!');
        }
        db.close();
      });
    }
  });
}

//-- get and send settings object --//

function get_settings() {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log('Unable to connect to the mongoDB server. Error:', err);
    var collection = db.collection('settings');
    collection.find().toArray(function (err, result) {
      if (err) return console.log(err);
      if (result[0]) settings = result[0]
      module.exports.settings = settings;
      if (!got_token) {
        console.log("fetching token...");
        socket.relay.emit('get token',{mac:utils.mac, device_type:['gateway']});          
        store_settings(settings);
      }
      //need to add device_array and send to client
      settings.devices = device_array;
      socket.relay.emit('load settings',settings);
      //console.log("get_settings",result[0]);
    });
  db.close();
});
}

//-- store new settings --//
function store_settings(data) {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log(err);
    var collection = db.collection('settings');
    //console.log('store_settings',data);
    collection.update({}, {$set:data}, {upsert:true}, function(err, item){
        //console.log("item",item)
    });
    db.close();
  });
}

//-- store new device --//
function store_device(device) {
  delete device["_id"];
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      var collection = db.collection('devices');
      collection.update({id:device.id}, {$set:device}, {upsert:true}, function(err, item){
        //console.log("update device: ",item)
      });
      collection.find().toArray(function (err, result) {
        if (err) {
          console.log(err);
        } else if (result.length) {
	  device_array = result;
        } else {
          console.log('No document(s) found with defined "find" criteria!');
        }
      });
      db.close();
    }
  });
  get_devices();
}

//-- load devices from database --//
function get_devices() {
  MongoClient.connect('mongodb://127.0.0.1:27017/gateway', function (err, db) {
    if (err) return console.log('get_devices |', err);
    var collection = db.collection('devices');
    collection.find().toArray(function (err, result) {
      if (err) return console.log(err);
      if (!result.length) return console.log('get_devices | no results');
      device_array = result;
      var devices_obj = settings;
      devices_obj.devices = device_array;
      //console.log("get_devices | sending devices");
    });
    db.close();
  });
  console.log("!! get_devices !!");
}

