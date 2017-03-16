// -------------------  author: Andy Payne andy@pyfi.org ----------------------- //
// -----------------  https://plus.google.com/+AndyPayne42  -------------------- //

console.log("loading devices...",device_array);

var thermostat = require('./thermostat.js');
var zwave = require('./zwave.js');
var lights = require('./lights.js');
var media = require('./media.js');
var alarm = require('./alarm.js');
var camera = require('./camera.js');
var socket = require('../socket.js');

module.exports.thermostat = thermostat;

socket.relay.on('room_sensor', function (data) {
  //console.log("room_sensor", data);
  if (data.mode == 'armed' && data.motion == 'Motion Detected') {
    alert = true;
    set_theme('alert');
  }
  if (data.status == 'disarmed') {
    alert = false;
    set_theme('presence');
  }
});

socket.relay.on('motion_sensor', function (data) {
  console.log("motion_sensor", data);
  if (data.mode == 'armed') {
    alert = true;
    set_theme('alert');
  }
  if (data.status == 'disarmed') {
    alert = false;
    set_theme('presence');
  }
});

socket.relay.on('window_sensor', function (data) {
  var _mac = data.mac;
  var _magnitude = data.magnitude;
  console.log( _mac + " | window_sensor data " + _magnitude);
});

socket.relay.on('gateway', function (data) {
  console.log(mac + " | " + data.command);
});
