# home-gateway
Home automation and media server for controlling devices like cameras, lights, thermostats, media, glass break, and sends alerts via text message.

=======
#installation
##install node 4.x from source
 wget https://nodejs.org/dist/v4.2.6/node-v4.2.6.tar.gz && tar -zxvf node-v4.2.6.tar.gz && cd node-v4.2.6 && ./configure && make && sudo make install
 
##gateway
1. git clone https://github.com/physiii/home-gateway.git
2. sudo nano /etc/rc.local
-- su pi -c 'sudo node ~/home-gateway/gateway >> ~/home-gateway/gateway.log 2>&1 &'

##camera (optional)
1. 1. sudo apt-get install apache2 mysql-server php5 php5-mysql php5-gd motion libmysqlclient-dev libcurl4-openssl-dev
2. sudo a2enmod cgi;
3. sudo nano /etc/default/motion
4. -- change to start_motion_daemon=yes
5. sudo nano /etc/motion/motion.conf
6. -- change to stream_localhost off
7. sudo chmod -R 777 /var/lib/motion

##initial connections
![Alt text](https://github.com/physiii/home-gateway/blob/master/screenshots/system%20overview%20-%20initial.jpg?raw=true "system overview")

##steady-state connections
![Alt text](https://github.com/physiii/home-gateway/blob/master/screenshots/system%20overview%20-%20steady%20state.jpg?raw=true "system overview")
