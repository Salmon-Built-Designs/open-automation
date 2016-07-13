###**open-automation** is made from a cohesive set of web languages. NodeJS for general processing, socket.io communication, PHP for generating, setting, and retreiving model (mysql) data, and websockets on microcontrollers. Interface is angularjs while incorporating open-hab's android and iphone applications.

Software for controlling cameras, dead bolts, garage openers, lights, thermostats, media, glass break, and sends alerts via text message. Camera and files are proxied out the port you set with -p [port]. Forward that port on your router to gain access to files and camera using remote tokens.



1. Angularjs frontend - http://open-automation.org
2. NodeJS and PHP for tokens, authentication, general processing
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
1. NodeJS for processing
2. Socket.IO communication
3. PHP for generating, setting, and retreiving model (mysql) data
4. Websockets on microcontrollers


##System Overview
![Alt text](https://github.com/physiii/home-gateway/blob/master/screenshots/system%20overview.jpg?raw=true "system overview")

#installation
##install node 4.x from source
1. wget https://nodejs.org/dist/v4.2.6/node-v4.2.6.tar.gz && tar -zxvf node-v4.2.6.tar.gz && cd node-v4.2.6 && ./configure && make && sudo make install
2. git clone https://github.com/physiii/open-automation.git && cd home-gateway && sh install.sh


