Voice recognition based home assistant.
This is a work in progress, no support is given.

Currently uses your webbrowser speech engine. For best result use Google Chrome. Not Chromium.
Requires MQTT 3.1 compliant server with Websockets. I use mosquitto, but you have to compile from source to enable websockets.

Requires Domoticz to be on the receiving end of MQTT.

Domoticz doesn't allow listing of devices over MQTT so in order to use your devices learn them by triggering the switch once. Any new device matching switchType On/Off will be added to the list.

HARDCODED FOR DUTCH AT THE MOMENT. Only requires small changes for your locale, but  was no prio now.