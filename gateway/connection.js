const exec = require('child_process').exec;
var fs = require('fs');

module.exports = {
  set_wifi: set_wifi,
  scan_wifi: scan_wifi,
  check_connection: check_connection,
}
var router_array = [];
var router_list = [];
var ap_mode = false;
scan_wifi();
var bad_connection = 0;
function check_connection() {
  var ping = require ("ping");
  host = "8.8.8.8";
  ping.sys.probe(host, function(isAlive) {
    var msg = isAlive ? 'alive' : 'dead';
    if (msg == 'dead') {
      bad_connection++;
      console.log('bad_connection',bad_connection);
      if (!ap_mode && bad_connection > 1) {
        var interfaces_file = "allow-hotplug wlan0\n"
                   + "iface wlan0 inet static\n"
    		   + "address 172.24.1.1\n"
    		   + "netmask 255.255.255.0\n"
    		   + "network 172.24.1.0\n"
    		   + "broadcast 172.24.1.255\n";
        fs.writeFile("/etc/network/interfaces", interfaces_file, function(err) {
          if(err) return console.log(err);
          console.log("Interface file saved, starting AP");
          exec("sudo ifdown wlan0 && sudo ifup wlan0 && sudo service dnsmasq restart && sudo hostapd /etc/hostapd/hostapd.conf");
          ap_mode = true;
          ap_time_start = Date.now();
        });
        bad_connection = 0;
      }
    }
    if (msg == 'alive') {
      bad_connection = 0;
    }
  });
}

function scan_wifi() {
  //console.log("scanning wifi...");
  exec("iwlist wlan0 scan | grep 'ESSID'", (error, stdout, stderr) => {
    if (error) {
      //console.error(`exec error: ${error}`);
      return;
    }
    router_array = stdout.split('\n');
    router_list = [];
    for(var i = 0; i < router_array.length; i++) {
      var router_ssid = router_array[i].replace(/^\s*/, "")
  			             .replace(/\s*$/, "")
 			             .replace("ESSID:\"","")
    			             .replace("\"","");
      router_list.push({ssid:router_ssid});
    }
    return router_list;
    //console.log("router_array | " + settings_obj.router_list);
  });
}

function set_wifi(data) {

    var wpa_supplicant = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n"
                       + "update_config=1\n"
		       + "country=GB\n"
                       + "network={\n"
		       + "ssid=\""+data.router_name+"\"\n"
		       + "psk=\""+data.router_password+"\"\n"
		       + "key_mgmt=WPA-PSK\n"
		       + "}\n";
    var interfaces_file = "source-directory /etc/network/interfaces.d\n"
			+ "auto lo\n"
			+ "iface lo inet loopback\n"
			+ "iface eth0 inet manual\n"
			+ "allow-hotplug wlan0\n"
			+ "iface wlan0 inet manual\n"
		    	+ "    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf\n";

    fs.writeFile("/etc/wpa_supplicant/wpa_supplicant.conf", wpa_supplicant, function(err) {
      if(err) {
        return console.log(err);
      }
      fs.writeFile("/etc/network/interfaces", interfaces_file, function(err) {
        if(err) {
          return console.log(err);
        }
        exec("sudo /bin/sh -c 'if ! [ \"$(ping -c 1 8.8.8.8)\" ]; then echo \"resetting wlan0\" && sudo ifdown wlan0 && sudo ifup wlan0; else echo \"connection is good\"; fi'", (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(stdout);
          console.log(stderr);
          //ap_mode = false;
          setTimeout(function () {
            //check_connection();
          }, 30*1000);
        });
      });
    });
  console.log("set_wifi");
}
