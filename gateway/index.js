// -------------------  author: Andy Payne andy@pyfi.org ----------------------- //
// -----------------  https://plus.google.com/+AndyPayne42  -------------------- //

console.log("starting gateway...");

local_ip = "127.0.0.1";
device_array = [];
var utils = require('../utils.js');
const admin = require('./admin.js');
var database = require('./database.js');
const connection = require('./connection.js');
var socket = require('./socket.js');
var devices = require('./devices');
var io_connected = false;
var server_type = "dev";

process.argv.forEach(function (val, index, array) {
  //console.log(index + ': ' + val);
  if (val == "dev")
    server_type = "dev";
  if (val == "prod")
    server_type = "prod";
});


var querystring = require('querystring');

var relay_server = "init";
//var server_ip = "init";
var server_port = "init";
//get_relay_server(server_type);
/*function get_relay_server(server_type) {
  if (server_type == 'dev') {
    request.get(
    'http://pyfi.org/php/get_ip.php?server_name=socket_io_dev',
    function (error, response, data) {
      if (!error && response.statusCode == 200) {
        relay_server = data;
        var parts = relay_server.split(":");
        server_ip = parts[0];
        server_port = parts[1];
        io_relay = require('socket.io-client')("http://"+relay_server);
        start_io_relay();
        if (error !== null) {
         console.log('error ---> ' + error);
        }
      }
    }); 
  }
  if (server_type == 'prod') {
    request.get(
    'http://pyfi.org/php/get_ip.php?server_name=socket_io',
    function (error, response, data) {
      if (!error && response.statusCode == 200) {
        relay_server = data;
        var parts = relay_server.split(":");
        server_ip = parts[0];
        server_port = parts[1];
        io_relay = require('socket.io-client')('http://'+relay_server+":5000");
        start_io_relay();
        if (error !== null) {
         console.log('error ---> ' + error);
        }
      }
    });
  }
}*/

var got_token = false;
var port = process.env.PORT || 3030;
var php = require("node-php");
var spawn = require('child_process').spawn;
var SSH = require('simple-ssh');
var EventEmitter = require("events").EventEmitter;
var omit = require('object.omit');
var body = new EventEmitter();
var gb_event = new EventEmitter();
var token = "init";
var d = new Date();
var light_delay = 0; //command delay in ms
var previous_data = 0;
var desired_temp = 70;
var current_therm_state = "";
var lights = [];
//var devices = [];
var username = "init";
var device_name = "init";
var count = 0;
var text_timeout = 0;
var platform = process.platform;

const exec = require('child_process').exec;
const execFile = require('child_process').execFile;
var zwave_disabled = true;
var io_relay_connected = false;

/*exec("mkdir files", (error, stdout, stderr) => {
  if (error) {
    //console.error(`exec error: ${error}`);
    return;
  }
  console.log("made files directory");
});*/

var ap_time_start;
main_loop();
function main_loop () {
  setTimeout(function () {
    var settings_obj = {public_ip:utils.public_ip, local_ip:utils.local_ip, mac:utils.mac}
    database.store_settings(settings_obj);
      if (!got_token) {
        console.log("fetching token...");
        socket.relay.emit('get token',{mac:utils.mac, device_type:['gateway']});
      }
    var settings = database.settings;
    //check_connection();
    if (database.settings.ap_mode) {
      ap_time = Date.now() - ap_time_start;
      console.log("ap_time",ap_time);
      if (ap_time > 10*60*1000) {
        console.log("trying wifi again...");
        set_wifi_from_db();
        exec("sudo reboot");
      }
    }
    utils.get_public_ip();
    connection.scan_wifi();
    devices.thermostat.get_therm_state();
    for (var i = 0; i < device_array.length; i++) {
      if (device_array[i].device_type == 'thermostat') {
        get_therm_state(device_array[i].local_ip);
      }
    }
    main_loop();
  }, 60*1000);
  //console.log(Date.now() + " | main loop");
}

