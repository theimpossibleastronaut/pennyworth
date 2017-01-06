var pennyworth = pennyworth || {

    engine: null,
    keyword: "alfred",
    mqtt: null,
    mqttReconnectTimeout: 3000,
    threshold: 0.5,
    logThreshold: 20,
    domoticzIn: "domoticz/in",
    domoticzOut: "domoticz/out",
    devices: [],

    init: function() {
        pennyworth.restoreVariables();

        pennyworth.engine = new (webkitSpeechRecognition || mozSpeechRecognition || msSpeechRecognition || SpeechRecognition)();
        pennyworth.engine.lang = 'nl-NL';
        pennyworth.engine.continuous = false;
        pennyworth.engine.interimResults = false;
        pennyworth.engine.maxAlternatives = 0; // No alternatives just give highest
        pennyworth.engine.onend = pennyworth.start; // Start on end :-)
        pennyworth.engine.onresult = pennyworth.engineResult;
        pennyworth.engine.onerror = pennyworth.engineError;
        pennyworth.engine.onnomatch = pennyworth.engineNoMatch;
        pennyworth.start();

        document.querySelector("#engine-threshold").addEventListener("change", function(ev) {
            pennyworth.threshold = ev.target.value;
            localStorage.setItem("engine-threshold", pennyworth.threshold);
        });

        document.querySelector("#mqtt-host").addEventListener("change", function(ev) {
            localStorage.setItem("mqtt-host", ev.target.value);
        });

        document.querySelector("#mqtt-port").addEventListener("change", function(ev) {
            localStorage.setItem("mqtt-port", ev.target.value);
        });

        document.querySelector("#devices").addEventListener("change", function(ev) {
            localStorage.setItem("devices", ev.target.value);
        });

        document.querySelector("#keyword").addEventListener("change", function(ev) {
            localStorage.setItem("keyword", ev.target.value);
            pennyworth.keyword = ev.target.value.trim().toLowerCase();
        });

        document.querySelector("#mqtt-connect").addEventListener("click", pennyworth.connectMQTT);

    },

    start: function(ev) {
        pennyworth.engine.start();
    },

    engineResult: function(ev) {
        if (ev.results &&
            ev.results.length > 0 &&
            ev.results[0][0] &&
            ev.results[0][0].transcript &&
            ev.results[0][0].confidence &&
            ev.results[0][0].confidence > pennyworth.threshold) {
            pennyworth.log("Herkend", ev.results[0][0].transcript,ev.results[0][0].confidence);

            // Smerig test.
            var str = ev.results[0][0].transcript.toLowerCase();
            var aan = (str.indexOf("aan") > -1);
            var uit = (str.indexOf("uit") > -1);

            if (str.indexOf(pennyworth.keyword) > -1) {
                for (var i = 0; i < pennyworth.devices.length; i++) {
                    var elms = pennyworth.devices[i].split(",");
                    if (elms.length > 1) {
                        if (str.indexOf(elms[1].toLowerCase().split("_").join(" ")) > -1 ||
                            str.indexOf(elms[1].toLowerCase().split("_").join("")) > -1) {
                            if (aan || uit) {
                                pennyworth.switchDevice(elms, aan ? 'On' : 'Off', aan ? 255 : 0);
                            }
                        }
                    }
                }
            }
        }

    },

    engineError: function(ev) {
        if (ev.error !== 'no-speech') {
            console.log(ev);
        }
    },

    engineNoMatch: function(ev) {
        console.log(ev);
    },

    connectMQTT: function(ev) {
        var unique = new Date().getTime();
        pennyworth.mqtt = new Paho.MQTT.Client(
            document.querySelector('#mqtt-host').value,
            parseInt(document.querySelector('#mqtt-port').value),
            'pennyworth-'+unique
        );

        pennyworth.mqtt.onMessageArrived = pennyworth.mqttMessage;
        pennyworth.mqtt.connect({
            onSuccess: pennyworth.mqttConnected,
            onFailure: pennyworth.mqttFailed
        });
    },

    mqttMessage: function(data) {
        var js = JSON.parse(data.payloadString);

        if (typeof js === 'object') {
            if (js.switchType.toLowerCase() == "on/off" ||
                (js.switchType.toLowerCase() == "dimmer" && js.stype.toLowerCase() == "rgbw") ) {
                pennyworth.log("Status", js.name, ["idx " + js.idx, "nvalue " + js.nvalue, "svalue " + js.svalue, "switchType " + js.switchType]);
                pennyworth.checkNewDevice(js);
            }
        }
    },

    mqttConnected: function() {
        pennyworth.log("MQTT Verbonden", "ws://" + pennyworth.mqtt.host + ":" + pennyworth.mqtt.port);
        pennyworth.mqtt.subscribe(pennyworth.domoticzOut);
        pennyworth.mqtt.onConnectionLost = pennyworth.mqttConnectionLost;
    },

    mqttFailed: function() {
        pennyworth.log("MQTT Niet verbonden", "ws://" + pennyworth.mqtt.host + ":" + pennyworth.mqtt.port);
    },

    mqttConnectionLost: function(obj) {
        pennyworth.log("MQTT Verbroken", obj.message, obj.code);

        setTimeout(pennyworth.connectMQTT, pennyworth.mqttReconnectTimeout);
    },

    switchDevice: function(elm, switchValue) {
        var switchType = elm[2].toLowerCase();

        if (switchType == "on/off") {
            var obj = {
                "command": "switchlight",
                "idx": parseInt(elm[0]),
                "switchcmd": switchValue
            }

            pennyworth.log("Verzend", "idx " + elm[0], switchValue);

            var message = new Paho.MQTT.Message(JSON.stringify(obj));
            message.destinationName = pennyworth.domoticzIn;
            pennyworth.mqtt.send(message);
        } else {
            pennyworth.log("TODO", "Switchtype nog niet ondersteund", elm);
        }
    },

    checkNewDevice: function(obj) {
        var str = obj.idx + "," + obj.name + "," + obj.switchType;
        str = str.trim();

        if (pennyworth.devices.indexOf(str) == -1) {
            pennyworth.devices.push(str);

            document.querySelector("#devices").innerHTML = pennyworth.devices.join("\n");
            localStorage.setItem("devices", document.querySelector("#devices").innerHTML);
        }
    },

    log: function(title,message,data) {
        var str = "<div class='log-message'>" + new Date().toLocaleTimeString() + " <b>" + title + "</b> " + message;
        if (data !== undefined && data !== false) {
            if (typeof data === "array") {
                data = data.join(",");
            }

            str += " (" + data + ")";
        }

        var logEl = document.querySelector("#log");
        logEl.innerHTML += str;

        // Cleanup
        var elms = document.querySelectorAll('div.log-message');
        if (elms.length > pennyworth.logThreshold) {
            elms[0].parentNode.removeChild(elms[0]);
        }
    },

    restoreVariables: function() {
        if (localStorage.getItem("engine-threshold")) {
            document.querySelector("#engine-threshold").value = parseFloat(localStorage.getItem("engine-threshold"));
            pennyworth.threshold = parseFloat(localStorage.getItem("engine-threshold"));
        }

        if (localStorage.getItem("mqtt-host")) {
            document.querySelector("#mqtt-host").value = localStorage.getItem("mqtt-host");
        }

        if (localStorage.getItem("mqtt-port")) {
            document.querySelector("#mqtt-port").value = localStorage.getItem("mqtt-port");
        }

        if (localStorage.getItem("keyword")) {
            document.querySelector("#keyword").value = localStorage.getItem("keyword");
            pennyworth.keyword = localStorage.getItem("keyword");
        }

        if (localStorage.getItem("devices")) {
            pennyworth.devices = localStorage.getItem("devices").trim().split("\n");
            document.querySelector("#devices").innerHTML = pennyworth.devices.join("\n");
        }

        if (localStorage.getItem("mqtt-host") && localStorage.getItem("mqtt-host")) {
            pennyworth.connectMQTT();
        }
    }

};

if ( document.readyState != 'loading' ) {
    pennyworth.init();
} else {
    document.addEventListener( 'DOMContentLoaded', pennyworth.init );
}