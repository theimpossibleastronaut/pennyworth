Voice recognition based home assistant.
This is a work in progress, no support is given.

Currently uses your webbrowser speech engine. For best result use Google Chrome. Not Chromium.
Requires MQTT 3.1 compliant server with Websockets. I use mosquitto, but you have to compile from source to enable websockets.

Requires Domoticz to be on the receiving end of MQTT.

Domoticz doesn't allow listing of devices over MQTT so in order to use your devices learn them by triggering the switch once. Any new device matching switchType On/Off will be added to the list.

HARDCODED FOR DUTCH AT THE MOMENT. Only requires small changes for your locale, but  was no prio now.

# Installation
## Requirements
Domoticz, MQTT 3.1 or 3.1.1 broker that's available over websockets (Mosquitto build from source, emqtt, hivemq or apache apollo).

## Building mosquito from source
If you want to use mosquitto, build steps below

```bash
sudo apt-get update
sudo apt-get install libssl-dev cmake uuid-dev
git clone https://github.com/warmcat/libwebsockets.git -b v2.0-stable libwebsockets
cd libwebsockets
mkdir build && cd build
cmake ..
make
sudo make install
cd ../..
wget http://www.eclipse.org/downloads/download.php?file=/mosquitto/source/mosquitto-1.4.9.tar.gz
tar xvzf mosquitto-1.4-tar.gz
cd mosquitto-1.4
vi config.mk
# Find WITH_WEBSOCKETS:= no and replace with WITH_WEBSOCKETS:= yes
make
sudo make install
sudo cp /etc/mosquitto/mosquitto.conf.example /etc/mosquitto/mosquitto.conf
```

In your mosquitto.conf append the following lines:

```bash
listener 1883
listener 9001
protocol websockets
```

You should take some steps to secure it, but for now leave this. Start your mosquitto instance.

## Add MQTT to homoticz
Go to hardware, add MQTT Gateway.

## Pennyworth
Clone the repo and serve it over HTTP, or HTTPS if using websockets + ssl.
Fill in your MQTT details and press the connect button.
Since Domoticz doesn't provide device listings over MQTT you should learn your devices first.
This can be done by triggering a Switch of type On/Off or Dimmer inside Domoticz.

Speak! Try "Alfred 'devicename' aan".

# Notes
Whilst the webspeech api uses your system text to speech, the speechrecognition api might route your request trough services of your browser vendor. If you're privacy concerned realize this.