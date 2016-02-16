// Setup basic express server
var fs = require('fs');
var os = require('os');
var express = require('express');
var app = express();
var program_app = express();
var querystring = require('querystring');
var http = require('http');
var server = require('http').createServer(app);
var program_server = require('http').createServer(program_app);
var program_io = require('socket.io')(program_server);
var io = require('socket.io')(server);
var io_upstairs = require('socket.io-client')('http://192.168.0.9:3000');
var io_downstairs = require('socket.io-client')('http://192.168.0.3:3000');
var io_relay = require('socket.io-client')('wss://peaceful-coast-12080.herokuapp.com');
var port = process.env.PORT || 3030;
//var program_port = process.env.PORT || 3000;
var php = require("node-php");
var request = require('request');
var exec = require('child_process').exec;
var mysql      = require('mysql');
var EventEmitter = require("events").EventEmitter;
var body = new EventEmitter();
var gb_event = new EventEmitter();
const gb_read = require('child_process').exec;

var d = new Date();
var light_delay = 0; //command delay in ms
var previous_data = 0;
var desired_temp = 70;
var current_therm_state = "";
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'device'
});

var username = "init";
var device_name = "init";
var mac = "init";
var ip = "init";
var device_port = "init";
var count = 0;
var text_timeout = 0;

//---------------------- get device info -------------------//
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }
    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }
    ++alias;
  });
});

require('getmac').getMac(function(err,macAddress){
  if (err)  throw err
  mac = macAddress;
});

fs.stat('./device_info.json', function(err, stat) {
  if(err == null) {
    console.log('found device_info.json');
    var device_info = require("./device_info.json");
    device_info = JSON.parse(device_info);
    for(var i = 0; i < device_info.length; i++) {
      mac = device_info[i].mac;
      token = device_info[i].token;
      io_relay.emit('token',{token:token});    
      console.log(mac + " | " + token);
    }
  } else if(err.code == 'ENOENT') {
    fs.writeFile('log.txt', 'Some log\n');
  } else {
    console.log('Some other error: ', err.code);
  }
});


// ----------------------------  web interface  ----------------------------- //
var program_port = process.env.PORT || 3000;
program_server.listen(program_port, function () {
  console.log('Access GUI on port %d', program_port);
});
program_app.use(express.static(__dirname + '/public'), php.cgi("/"));
program_io.on('connection', function (socket) {
  socket.on('get_token', function (data) {
    user = data['user'];
    password = data['pwd'];
    post_data = {user:user, pwd:password, mac:mac};
    var response = request.post(
      'http://68.12.157.176:8080/pyfi.org/php/set_token.php',
      {form: post_data},
      function (error, response, data) {
        if (!error && response.statusCode == 200) {
          body.data = data;
  
  console.log('set_token.php says: ' + data);
  io_relay.emit('token',{token:token});
  fs.writeFile( "device_info.json", JSON.stringify( body.data ), "utf8", callback );
  function callback(){
    console.log('callback for device_info.json');
  }            
          //body.emit('update');
        }
      }
    );
    
    console.log( "token received for " + data['user']);
  });
});

var ping_time = Date.now();
function ping(){
  ping_time = Date.now();
  console.log('sending ping...');
  io_relay.emit('png_test');
}

// --------------  websocket server for devices  ----------------- //
var ws_port = process.env.PORT || 4000;
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: ws_port });
console.log('websockets on port %d', ws_port);
wss.on('connection', function connection(ws) {
  try {
    ws.send('Hello from server!');  
  }
  catch (e) { 
    console.log("error: " + e)
  }
  ws.on('message', function incoming(message) {
    console.log(message);
  });
  ws.on('error', function() {
    console.log('error catch!');
  });
});

// ------------------  relayed socket.io messages  ------------------- //
//var io_relay = require('socket.io-client')('wss://pyfi-relay.herokuapp.com');
var io_relay = require('socket.io-client')('http://68.12.157.176:5000');
io_relay.on('png_test', function (data) {
  ping_time = Date.now() - ping_time;
  console.log("replied in " + ping_time + "ms");
});

io_relay.on('media', function (data) {
  console.log("token | " + data.token);
  console.log("media | " + data.cmd);
});

io_relay.emit('authentication', {username: "John", password: "secret", mac: mac});
var auth_time = Date.now();
io_relay.on('authenticated', function() {
  auth_time = Date.now() - auth_time;
  console.log('!!! authenticated in ' + auth_time + 'ms !!!');
  io_relay.on('token', function (data) {
    //get token from mysql database
    //check data['token'] w database token
    console.log('token: ' + data['token']);
    console.log( Date.now() + " valid token");
  });   
});

/// create tables if the do not exist ///
var query = "create table gateway_tok (timestamp text, user text, token text, mac text, ip text, port text, device_name text)";
connection.connect();
connection.query(query, function(err, rows, fields) {
  if (err) {
    //console.log('table already exist');  
  } else {
    console.log('created gateway_tok table');
    //store device info in database
    
  }
});

server.listen(port, function () {
  console.log('send-receive commands on port %d', port);
});

io.on('connection', function (socket) {
get_therm_state();
function gb_timeout(){
  setTimeout(function () {
    gb_loop();
  }, 100)
}

var previous_gb_value = "";
var temp = 0;
function gb_loop(){
  const child = gb_read('gpio -g read 23',
    (error, stdout, stderr) => {
      gb_value = stdout;
      if (previous_gb_value != gb_value && text_timeout == 0){
        temp = Date.now();
        count = count + 1;
        console.log("window sensor triggered " + count);
        io.emit('gpio_pin',count);
        setTimeout(function () {
          count = 0;
        }, 10000);
      }
      if (count >= 10){
        if (text_timeout == 0){
          console.log("sending text alert!");
          //send_command("curl -d number=\"4058168685\" -d \"message=ALERT:living room window sensor triggered\" http://textbelt.com/text");
          text_timeout = 1; 
          setTimeout(function () {
            text_timeout = 0;
          }, 60000); 
         count = 0;
        }
      }
      previous_gb_value = gb_value;
  });
  gb_timeout();
}
  gb_timeout();

  socket.on('thermostat', function (data) {
    var state = JSON.parse(current_therm_state);
    console.log("finding temperature " + state.temp);
    if (data == "temp_up"){
      desired_temp = desired_temp + 2;   
    } 
    if (data == "temp_down"){
      desired_temp = desired_temp - 2;     
    }
    if (state.temp > desired_temp){
      mode = "t_cool";
    } else {
      mode = "t_heat";
    }
    send_command("curl -d '{\"tmode\":1,\""+mode+"\":"+desired_temp+",\"hold\":1}' http://192.168.0.27/tstat");
    io.emit('thermostat', {"temp":desired_temp});
    console.log( Date.now() + " thermostat " + data);
    console.log("new temp: " + desired_temp);
  });

  socket.on('token', function (data) {
    //get token from mysql database
    //check data['token'] w database token
    console.log('token: ' + data['token']);
    console.log( Date.now() + " valid token");
  });  

  socket.on('media_upstairs', function (data) {
    io_upstairs.emit('media', data);
    console.log( Date.now() + " upstairs " + data);
  });

  socket.on('media_downstairs', function (data) {
    io_downstairs.emit('media', data);
    console.log( Date.now() + " downstairs " + data);
  });
  
  socket.on('peerflix_downstairs', function (data) {
    io_downstairs.emit('peerflix', data);
    console.log( Date.now() + " downstairs peerflix " + data);
  });  
  
  socket.on('peerflix_upstairs', function (data) {
    io_upstairs.emit('peerflix', data);
    console.log( Date.now() + " upstairs peerflix " + data);
  });  

  socket.on('lights', function (data) {
      //Date.now = function() { return new Date().getTime(); }
      console.log("<<-------- " + Date.now() + " -------->>");
      if (data <= 254 && data >= 0){
         if (data > 200) data = 254;
         diff = Math.abs(data - previous_data);
         if (diff > 20){
           send_command("perl "+__dirname+"/huepl bri 1 " + data);
           send_command("perl "+__dirname+"/huepl bri 2 " + data);
           send_command("perl "+__dirname+"/huepl bri 3 " + data);
           //send_command("perl "+__dirname+"/huepl bri 4 " + data);
           send_command("perl "+__dirname+"/huepl bri 5 " + data); 
           send_command("perl "+__dirname+"/huepl bri 6 " + data); 
           send_command("perl "+__dirname+"/huepl bri 7 " + data); 
           send_command("perl "+__dirname+"/huepl bri 8 " + data);
           send_command("perl "+__dirname+"/huepl bri 9 " + data); 
           previous_data = data;
         }
      } else {
      if (data != "off") {
        send_command("perl "+__dirname+"/huepl on 1");
        send_command("perl "+__dirname+"/huepl on 2");
        send_command("perl "+__dirname+"/huepl on 3");
        //send_command("perl "+__dirname+"/huepl on 4");
        send_command("perl "+__dirname+"/huepl on 5");         
        send_command("perl "+__dirname+"/huepl on 6");
        send_command("perl "+__dirname+"/huepl on 7");         
        send_command("perl "+__dirname+"/huepl on 8");
        send_command("perl "+__dirname+"/huepl on 9");         
        //send_command("perl "+__dirname+"/huepl on 10");
       }
       send_command("perl "+__dirname+"/huepl "+data+" 1");
       send_command("perl "+__dirname+"/huepl "+data+" 2");
       send_command("perl "+__dirname+"/huepl "+data+" 3");
       //send_command("perl "+__dirname+"/huepl "+data+" 4");
       send_command("perl "+__dirname+"/huepl "+data+" 5");
       send_command("perl "+__dirname+"/huepl "+data+" 6");
       send_command("perl "+__dirname+"/huepl "+data+" 7");
       send_command("perl "+__dirname+"/huepl "+data+" 8");
       send_command("perl "+__dirname+"/huepl "+data+" 9");
       //send_command("perl "+__dirname+"/huepl "+data+" 10");
       }
  });
});

// -------------------------------------------------------- //

function get_therm_state(){
  command = "curl http://192.168.0.27/tstat";
  console.log(command);
  var child = exec(command,
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    current_therm_state = stdout;
    if (error !== null) {
      console.log('' + error);
    }
  });
}

function send_command(command){
  console.log(command);
  var child = exec(command,
  function (error, stdout, stderr) {
    if (error !== null) {
      console.log('' + error);
    }
  });
}


/*    
body.on('update', function () {
  var token = body.data;
  console.log('user '+username+' | token '+token+' | mac '+mac+' | ip '+ip+' | port '+device_port+' | device_name '+ device_name);
  
  query = "insert";
  connection.query(query, function(err, rows, fields) {
    if (err) {
      //console.log('table already exist');  
    } else {
      console.log('created gateway_table');  
    }
  });
});



/// launch device programming gui on the program_port ///
/*program_server.listen(program_port, function () {
  console.log('program GUI on port %d', program_port);
});

program_app.use(express.static(__dirname + '/public'), php.cgi("/"));
program_io.on('connection', function (socket) {
  socket.on('get_token', function (data) {
    username = data['user'];
    device_name = data['device_name'];
    ip = data['ip'];
    device_port = data['device_port']
    var response = request.post(
      'http://68.12.157.176:8080/pyfi.org/php/set_video.php',
      {form: data},
      function (error, response, data) {
        if (!error && response.statusCode == 200) {
          //console.log(body);
          body.data = data;
          body.emit('update');
        }
      }
    );
    
    console.log( Date.now() + " | token received for " + data['user']);
  });
});*/

