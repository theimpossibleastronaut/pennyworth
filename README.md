Voice recognition based home assistant.
This is a work in progress, no support is given.

Currently uses your webbrowser speech engine. For best result use Google Chrome. Not Chromium.
Requires MQTT 3.1 compliant server with Websockets. I use mqtt, but you have to compile from source to enable websockets.

Requires Domoticz to be on the receiving end of MQTT.

Currently stores no data, so in order to use your devices, learn them on page load (e.g. trigger a switch from domoticz and it will get added to the list).

HARDCODED FOR DUTCH AT THE MOMENT. Only requires small changes for your locale, but  was no prio now.