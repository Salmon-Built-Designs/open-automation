## This repository contains the relay server portion of open-automation. Main function is to route and process device and user data.

### open-automation is made from a cohesive set of web languages. NodeJS for general processing, socket.io for bidirectional communication. NodeJS is used for generating, setting, and retreiving model (mongodb) data. Websockets is used for transport on microcontrollers. Live token based streaming with JSMPEG decoding on camera devices. Web interface is angularjs. Android app for location beacons. Now supports streaming from behind routers, this is done through websockets; so no port forwarding necessary!

Software for controlling cameras, dead bolts, garage openers, lights, thermostats, media, glass break, and sends alerts via text message.

### Automation Gateway 
Send and receive messages w wifi and zwave devices.
### Solar Powered Security Camera
Adjustable bitrate for low data streaming and timeout functions to save data cost.
### Motion Detection w Recording
Uses motion to trigger recording to local disk and local disk can be proxied (working on streaming from disk but should be similar to streaming from webcam)

1. Angularjs frontend - http://open-automation.org
2. NodeJS and MongoDB for tokens, authentication, general processing
3. websocket relay server to communicate behind firewalls and routers - https://github.com/physiii/node-relay
4. z-wave compatible - https://github.com/OpenZWave
5. text alerts
6. motion - http://www.lavrsen.dk/foswiki/bin/view/Motion/WebHome
7. files - https://github.com/efeiefei/node-file-manager
8. thermostat - http://www.radiothermostat.com/
9. android - https://github.com/physiii/beacon

## similar projects
1. openhab - https://github.com/openhab/openhab
2. Z-Wave-Me - https://github.com/Z-Wave-Me/home-automation
3. home-assistant - https://github.com/home-assistant/home-assistant

## differences
1. NodeJS with MongoDB for processing
2. Socket.IO communication
3. NodeJS for generating, setting, and retreiving tokens
4. Websockets on microcontrollers


## System Overview
![Alt text](https://github.com/physiii/home-gateway/blob/master/screenshots/system_overview.png?raw=true "system overview")


##Dashboard
![Alt text](https://github.com/physiii/open-automation/blob/master/screenshots/dashboard.png "Dashboard")

##Dashboard
![Alt text](https://github.com/physiii/open-automation/blob/master/screenshots/dashboard2.jpg "Dashboard")

##Dashboard
![Alt text](https://github.com/physiii/open-automation/blob/master/screenshots/sidebyside.jpg "Dashboard")

##Mobile
![Alt text](https://github.com/physiii/open-automation/blob/master/screenshots/mobile.png "Mobile")

##Device List
![Alt text](https://github.com/physiii/open-automation/blob/master/screenshots/mobile_device_list.png "Device List")

# installation
## install node 4.x from source
1. wget https://nodejs.org/dist/v4.2.6/node-v4.2.6.tar.gz && tar -zxvf node-v4.2.6.tar.gz && cd node-v4.2.6 && ./configure && make && sudo make install
2. git clone https://github.com/physiii/open-automation.git && cd open-automation && sh install.sh

