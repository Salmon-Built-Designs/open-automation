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
var io_relay = require('socket.io-client')('http://68.12.157.176:5000');
var port = process.env.PORT || 3030;
//var program_port = process.env.PORT || 3000;
var php = require("node-php");
var request = require('request');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var mysql      = require('mysql');
var EventEmitter = require("events").EventEmitter;
var body = new EventEmitter();
var gb_event = new EventEmitter();
const gb_read = require('child_process').exec;
var token = "init";
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
var ip = "init";
var device_port = "init";
var count = 0;
var text_timeout = 0
var platform = process.platform;
//console.log("This platform is " + platform);

var hue = require("node-hue-api");
var info_obj = JSON.parse(fs.readFileSync('info.json', 'utf8'));



// ----------------------  find bridges  ------------------- //
var bridge_obj = {};
var displayBridges = function(bridge) {
    bridge_obj = bridge[0];
    info_obj['ip'] = bridge_obj.ipaddress;
    fs.writeFile( "info.json", JSON.stringify(info_obj), "utf8" );
    console.log("Hue Bridges Found: " + JSON.stringify(bridge));
};
hue.nupnpSearch().then(displayBridges).done();

// ----------------------  link bridge  ------------------- //
function link_hue_bridge(ipaddress) {

var HueApi = require("node-hue-api").HueApi;

console.log(ipaddress);
var hostname = ipaddress,
    userDescription = "Node Gateway";

var displayUserResult = function(result) {
    info_obj['ip'] = ipaddress;
    info_obj['user'] = result;
    info_obj['token'] = token;
    fs.writeFile( "info.json", JSON.stringify(info_obj), "utf8" );
    console.log("Created user: " + JSON.stringify(result));
};

var displayError = function(err) {
    console.log(err);
};

var hue = new HueApi();

// Using a promise
hue.registerUser(hostname, userDescription)
    .then(displayUserResult)
    .fail(displayError)
    .done();

}
link_hue_bridge(info_obj.ip);

// Using a callback (with default description and auto generated username)
/*hue.createUser(hostname, function(err, user) {
    if (err) throw err;
    displayUserResult(user);
});*/

// ----------------------  finding lights  ------------------- //
var HueApi = require("node-hue-api").HueApi;

var displayResult = function(result) {
    info_obj['lights'] = result.lights;
    fs.writeFile( "info.json", JSON.stringify(info_obj), "utf8" );    
    //console.log(JSON.stringify(result, null, 2));
    //io_relay.emit('device_info',info_obj);
};

var host = info_obj.ip,
    username = info_obj.user,
    api;

api = new HueApi(host, username);

// Using a promise
api.lights()
    .then(displayResult)
    .done();

// Using a callback
api.lights(function(err, lights) {
    if (err) throw err;
    displayResult(lights);
});

// --------------------  setting light state  ----------------- //

function set_light(light_id,state) {

var hue = require("node-hue-api"),
    HueApi = hue.HueApi,
    lightState = hue.lightState;

var displayResult = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var host = info_obj.ip,
    username = info_obj.user,
    api = new HueApi(host, username),
    state;

// Set light state to 'on' with warm white value of 500 and brightness set to 100%
//state = lightState.create().on().white(500, 100);

// --------------------------
// Using a promise
api.setLightState(light_id, state)
    .then(displayResult)
    .done();

// --------------------------
// Using a callback
/*api.setLightState(5, state, function(err, lights) {
    if (err) throw err;
    displayResult(lights);
});*/

}

io_relay.emit('device_info',"testtt");
io_relay.emit('png_test');
for (var i=0; i < info_obj.lights.length; i++) {
  console.log("info_obj.lights | " + info_obj.lights[i].id);
  var state = [];
  state['on'] = true;
  state['bri'] = 0;
  if (info_obj.lights[i].state.hue) {
    state['hue'] = "1000";
  console.log("hue state " + info_obj.lights[i].state.hue);    
  }
  set_light(info_obj.lights[i].id,state);
}
/*set_light(3);
set_light(4);
set_light(5);
set_light(6);
set_light(7);
set_light(8);
set_light(9);*/

// ----------------------  get device info  ------------------- //
var local_ip = "init";
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
      //console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
    }
    local_ip = iface.address;
    ++alias;
  });
});

var mac = "init";
var device_type = "gateway/camera";
var device_name = "Gateway";
require('getmac').getMac(function(err,macAddress){
  if (err)  throw err
  mac = macAddress.replace(/:/g,'').replace(/-/g,'').toLowerCase();
  console.log("Enter device ID (" + mac + ") at http://dev.pyfi.org");
  io_relay.emit('get_token',{ mac:mac, local_ip:local_ip, port:camera_port, device_type:device_type, device_name:device_name });
});

// ----------------------  cloud server  ------------------- //
var koa =require('koa');
var path = require('path');
var tracer = require('tracer');
var mount = require('koa-mount');
var morgan = require('koa-morgan');
var koaStatic = require('koa-static');

// Config
var argv = require('optimist')
  .usage([
    'USAGE: $0 [-p <port>] [-d <directory>]']
  )
  .option('camera_port', {
    alias: 'p',
    'default': 3031,
    description: 'Server Port'
  })
  .option('directory', {
    alias: 'd',
    'default':'./files',
    description: 'Root Files Directory'
  })
  .option('version', {
    alias: 'v',
    description: 'Server　Version'
  })
  .option('help', {
    alias: 'h',
    description: "Display This Help Message"
  })
  .argv;

if (argv.help) {
  require('optimist').showHelp(console.log);
  process.exit(0);
}

if (argv.version) {
  console.log('FileManager', require('./package.json').version);
  process.exit(0);
}

global.C = {
  data: {
    root: argv.directory || path.dirname('.')
  },
  logger: require('tracer').console({level: 'info'}),
  morganFormat: ':date[iso] :remote-addr :method :url :status :res[content-length] :response-time ms'
};

// Start Server
var Tools = require('./tools');

var app = koa();
app.proxy = true;
app.use(Tools.handelError);
app.use(Tools.realIp);
app.use(morgan.middleware(C.morganFormat));

var IndexRouter = require('./routes');

app.use(koaStatic('./public/'));

var startServer = function (app, port) {
  app.listen(port);
  //C.logger.info('listening on *.' + port);
};

startServer(app, + 9090);

//---------------------- proxy servers -------------------//
var camera_port = argv.camera_port;
//var camera_port = 3031;
var httpProxy = require('http-proxy');
//var camera_proxy = httpProxy.createProxyServer();
var proxy = httpProxy.createProxyServer();
http.createServer(function(req, res) {
  session_id = "/session/" + token;
  //cloud_id = "/cloud/" + token;
  console.log(req.url.substring(1,129));
  if (req.url.substring(1,129) === token || req.url.substring(0,3) === "/js") {
    //req['url'] = '';
    proxy.web(req, res, { target:'http://localhost:9090' });
    console.log("cloud proxied");
  } else
  if (req.url === session_id) {
    //req['url'] = '';  
    proxy.web(req, res, { target:'http://localhost:8081', prependPath: false });
    console.log("camera proxied");
  } else {
    console.log("denied");
  }
}).listen(camera_port, function () {
  console.log('To use camera and file server, forward port '+camera_port+' to '+local_ip+' in your routers settings');
});

// ----------------------------  web interface  ----------------------------- //
/*
var program_port = 3000;
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
          console.log('set_token.php says: ' + data.token);
          //io_relay.emit('token',{token:"blah"});
          fs.writeFile( "device_info.json", data.token, "utf8", callback );
          function callback(){
            console.log('callback for device_info.json');
          }
          //body.data = data;          
          //body.emit('update');
        }
      });
    console.log( "token received for " + data['user']);
  });
});
*/
// --------------  websocket server for devices  ----------------- //
var ws_port = 4040;
var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: ws_port });
//console.log('websockets on port %d', ws_port);
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

io_relay.on('token', function (data) {
  token = data.token;
  session_string = '/' + token;
  app.use(mount(session_string, IndexRouter));
  info_obj['token'] = token;
  info_obj['mac'] = mac;
  fs.writeFile( "info.json", JSON.stringify(info_obj), "utf8" );  
  //fs.writeFile( "session.dat", data.token, "utf8", callback );  
  function callback(){
    //console.log('callback for session.dat');
  }  
  //console.log("token set " + token);
});

io_relay.on('png_test', function (data) {
  ping_time = Date.now() - ping_time;
  console.log("replied in " + ping_time + "ms");
});

io_relay.on('link_lights', function (data) {
  io_relay.emit('device_info',info_obj);
  console.log("emmitting light info");  
});

io_relay.on('media', function (data) {
  var command = data.cmd;
  if ( platform === "win32" ) {
    if (command == "volume_down"){
      spawn('nircmd.exe', ['mutesysvolume', '0']);        
      spawn('nircmd.exe', ['changesysvolume', '-5000']);
    }
    if (command == "volume_up"){  
      spawn('nircmd.exe', ['mutesysvolume', '0']);
      spawn('nircmd.exe', ['changesysvolume', '+5000']);
    }
    if (command == "mute"){ spawn('nircmd.exe', ['mutesysvolume', '1']) }
    if (command == "play"){ spawn('nircmd.exe', ['mutesysvolume', '1']) }
  } else
  if ( platform === "linux" ) {  
    if ( command === "volume_down" ) { spawn('xdotool', ['key', 'XF86AudioLowerVolume']) }
    if ( command === "volume_up" ) { spawn('xdotool', ['key', 'XF86AudioRaiseVolume']) }
    if ( command === "mute" ) { spawn('xdotool', ['key', 'XF86AudioMute']) }
    if ( command === "play" ) { spawn('xdotool', ['key', 'XF86AudioPlay']) }
    if ( command === "next" ) { spawn('xdotool', ['key', 'XF86AudioNext']) }  
    //for volume slider use: xodotool amixer -c 0 sset Master,0 80%
  } else {
    console.log("platform not supported " + platform);
  }

  console.log("media | " + command);
});

io_relay.on('gateway', function (data) {
  console.log(mac + " | " + data.command);
});
/*
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
*/
// -------------------------------------------------------- //
var ping_time = Date.now();
function ping(){
  ping_time = Date.now();
  console.log('sending ping...');
  io_relay.emit('png_test');
}
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
  //console.log('send-receive commands on port %d', port);
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
*/
