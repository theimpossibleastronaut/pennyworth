var pennyworth = pennyworth || {

    engine: null,
    mqtt: null,
    threshold: 0.5,
    logThreshold: 20,
    domoticzIn: "domoticz/in",
    domoticzOut: "domoticz/out",
    devices: [],

    init: function() {
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
        });

        document.querySelector("#mqtt-connect").addEventListener("click", function(ev) {
            var unique = new Date().getTime();
            pennyworth.mqtt = new Paho.MQTT.Client(
                document.querySelector('#mqtt-host').value,
                parseInt(document.querySelector('#mqtt-port').value),
                'pennyworth-'+unique
            );

            pennyworth.mqtt.onMessageArrived = pennyworth.mqttMessage;
            pennyworth.mqtt.connect({onSuccess: pennyworth.mqttConnected});
        });

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

            var devices = document.querySelector("#devices").value.trim();
            devices = devices.split("\n");

            for (var i = 0; i < devices.length; i++) {
                var elms = devices[i].split(",");
                if (elms.length > 1) {
                    if (str.indexOf(elms[1].toLowerCase()) > -1) {
                        if (aan || uit) {
                            pennyworth.switchDevice(elms[0], aan ? 'On' : 'Off', aan ? 255 : 0);
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

    mqttMessage: function(data) {
        var js = JSON.parse(data.payloadString);

        if (typeof js === 'object') {
            if (js.switchType.toLowerCase() == "on/off") {
                pennyworth.log("Status", js.name, ["idx " + js.idx, "value " + js.nvalue]);
                pennyworth.checkNewDevice(js);
            }
        }
    },

    mqttConnected: function() {
        pennyworth.log("MQTT Verbonden", "ws://" + pennyworth.mqtt.host + ":" + pennyworth.mqtt.port);
        pennyworth.mqtt.subscribe(pennyworth.domoticzOut);
    },

    switchDevice: function(idx, switchValue) {
        var obj = {
            "command": "switchlight",
            "idx": parseInt(idx),
            "switchcmd": switchValue
        }

        pennyworth.log("Verzend", "idx " + idx, switchValue);

        var message = new Paho.MQTT.Message(JSON.stringify(obj));
        message.destinationName = pennyworth.domoticzIn;
        pennyworth.mqtt.send(message);
    },

    checkNewDevice: function(obj) {
        var str = obj.idx + "," + obj.name;
        str = str.trim();

        if (pennyworth.devices.indexOf(str) == -1) {
            pennyworth.devices.push(str);

            document.querySelector("#devices").innerHTML += str + "\n";
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
    }

};

if ( document.readyState != 'loading' ) {
    pennyworth.init();
} else {
    document.addEventListener( 'DOMContentLoaded', pennyworth.init );
}