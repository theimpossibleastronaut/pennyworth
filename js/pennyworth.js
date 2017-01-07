class pennyworth {

    constructor(
        configuration
    ) {

        this.configuration = configuration;
        this.restoreSettings();
        this.bindSettings();

        this.speechRecognitionEngine = new this.configuration.speechRecognitionEngine();
        this.linguistics = new this.configuration.linguisticsEngine(
            this.speechRecognitionEngine,
            this.configuration.speechLanguage,
            this.configuration.speechRecognitionKeyword.toLowerCase(),
            this.devices
        );

        this.configureSpeechRecognitionEngine();
        this.startSpeechRecognitionEngine();

        this.talkback( false, this.configuration.speechRecognitionKeyword + ' tot uw dienst' );

        if ( this.configuration.mqttAutoConnect ) {
            this.connectMQTT();
        }
    }

    configureSpeechRecognitionEngine() {
        // _ to - for engine.
        this.speechRecognitionEngine.lang = this.configuration.speechLanguage.split( '_' ).join( '-' );
        this.speechRecognitionEngine.continuous = false;
        this.speechRecognitionEngine.interimResults = false;
        this.speechRecognitionEngine.maxAlternatives = 0;

        // Restart if ended
        this.speechRecognitionEngine.onend = this.startSpeechRecognitionEngine.bind( this );
        this.speechRecognitionEngine.onerror = this.onSpeechRecognitionEngineError.bind( this );
        this.speechRecognitionEngine.onresult = this.onSpeechRecognitionEngineResult.bind( this );
    }

    startSpeechRecognitionEngine( ev ) {
        this.speechRecognitionEngine.start();
    }

    onSpeechRecognitionEngineError( ev ) {
        if ( ev.error !== 'no-speech' ) {
            this.log( 'Speech recognition error', ev.error );
            console.log( ev );
        }
    }

    onSpeechRecognitionEngineResult( ev ) {
        if ( ev.results &&
             ev.results.length > 0) {
            let lastElem = ev.results[ ev.results.length - 1 ];

            if ( lastElem.length > 0 &&
                 lastElem[ 0 ].transcript &&
                 lastElem[ 0 ].confidence >= this.configuration.speechRecognitionThreshold ) {

                // Smerig test.
                let str = lastElem[ 0 ].transcript.trim().toLowerCase();
                if ( str.indexOf( this.configuration.speechRecognitionKeyword.toLowerCase() ) >= 0 ) {

                    this.log( 'Herkend', str, lastElem[ 0 ].confidence );

                    let results = this.linguistics.analyze( str );

                    if ( results.error === false &&
                         results.matchedDeviceNames.length > 0 &&
                         results.action !== false )
                    {

                        let stringAction = '';
                        switch ( results.action ) {
                            case 'aan': stringAction = ' worden aan gezet'; break;
                            case 'uit': stringAction = ' worden uit gezet'; break;
                            case 'open': stringAction = ' worden geöpend'; break;
                            case 'dicht': stringAction = ' worden gesloten'; break;
                        }

                        var device = results.matchedDevices[ 0 ].split( ',' );
                        if ( device[ 2 ].toLowerCase() == 'on/off' ) {
                            this.setSwitchValue( device, results.action );
                        }

                        this.talkback( 'confirm', results.matchedDeviceNames[ 0 ] + stringAction );
                    }

                }
            } else if (
                 lastElem.length > 0 &&
                 lastElem[ 0 ].transcript &&
                 lastElem[ 0 ].confidence >= this.configuration.speechRecognitionThreshold ) {

                this.talkback( 'notsure', lastElem[ 0 ].transcript );
            }
        }
    }

    // -------------------------------------------------------------------------
    // MQTT
    connectMQTT() {
        let clientId = localStorage.getItem( 'mqtt-clientId' ) || 'pennyworth_' + new Date().getTime();
        localStorage.setItem( 'mqtt-clientId', clientId );

        this.mqtt = new Paho.MQTT.Client(
            this.configuration.mqttHost,
            parseInt( this.configuration.mqttPort ),
            clientId
        );

        this.mqtt.onMessageArrived = this.mqttMessageArrived.bind( this );
        this.mqtt.onMessageDelivered = this.mqttMessageDelivered.bind( this );

        let connectionObject = {
            useSSL: this.configuration.mqttSsl,
            invocationContext: this,
            keepAliveInterval: 60,
            onSuccess: this.mqttConnected.bind( this ),
            onFailure: this.mqttFailed.bind( this )
        };

        if ( this.configuration.mqttUsername.length > 0 &&
             this.configuration.mqttPassword.length > 0 )
        {
            connectionObject.userName = this.configuration.mqttUsername;
            connectionObject.password = this.configuration.mqttPassword;
        }

        this.mqtt.connect( connectionObject );
    }

    mqttConnected() {
        this.log( 'MQTT Verbonden', this.mqtt.host + ':' + this.mqtt.port, 'SSL: ' + this.configuration.mqttSsl );
        this.mqtt.subscribe( this.configuration.domoticz.channelOut );
        this.mqtt.onConnectionLost = this.mqttConnectionLost.bind( this );
    }

    mqttFailed() {
        this.log( 'MQTT Niet verbonden', this.mqtt.host + ':' + this.mqtt.port, 'SSL: ' + this.configuration.mqttSsl );
    }

    mqttConnectionLost( obj ) {
        console.log(obj);
        this.log( 'MQTT Verbroken', this.mqtt.host + ':' + this.mqtt.port, ['SSL: ' + this.configuration.mqttSsl, obj.message] );
        setTimeout( this.connectMQTT.bind( this ), 3000 );
    }

    mqttMessageArrived( message ) {
        var js = JSON.parse(message.payloadString);

        if ( typeof js === 'object' && js.switchType ) {
            if ( js.switchType.toLowerCase() == 'on/off' ||
                 ( js.switchType.toLowerCase() == 'dimmer' &&
                   js.stype.toLowerCase() == 'rgbw'
                 )
            ) {
                this.log( 'Status', js.name, [ 'idx ' + js.idx, 'nvalue ' + js.nvalue, 'svalue ' + js.svalue, 'switchType ' + js.switchType ] );
                this.checkNewDevice( js );
            }
        }
    }

    mqttMessageDelivered( message ) {

    }

    // -------------------------------------------------------------------------
    // Device logic
    checkNewDevice( obj ) {
        var str = obj.idx + ',' + obj.name + ',' + obj.switchType;
        str = str.trim();

        if ( this.devices.indexOf( str ) == -1 ) {
            this.devices.push( str );

            document.querySelector( '#devices' ).value = this.devices.join( '\n' );
            localStorage.setItem( 'devices', document.querySelector( '#devices').value );
            this.linguistics.updateDevices( this.devices );
        }
    }

    setSwitchValue( device, action ) {
        let value = action == 'aan' || action == 'open' ? 'On' : 'Off';
        let message = {
            "command": "switchlight",
            "idx": parseInt( device[ 0 ] ),
            "switchcmd": value
        }

        this.log( 'Verzend', 'idx ' + device[ 0 ] + ', ' + device[ 1 ], value );
        this.sendDeviceMessage( message );
    }

    sendDeviceMessage( data ) {
        let m = new Paho.MQTT.Message( JSON.stringify( data ) );
        m.destinationName = this.configuration.domoticz.channelIn;
        this.mqtt.send( m );
    }

    // -------------------------------------------------------------------------
    // Settings
    restoreSettings() {
        document.querySelector( '#speech-recognition-threshold' ).value = parseFloat( this.configuration.speechRecognitionThreshold );
        document.querySelector( '#mqtt-host' ).value = this.configuration.mqttHost;
        document.querySelector( '#mqtt-port' ).value = parseInt( this.configuration.mqttPort );
        document.querySelector( '#mqtt-username' ).value = this.configuration.mqttUsername;
        document.querySelector( '#mqtt-password' ).value = this.configuration.mqttPassword;
        document.querySelector( '#mqtt-ssl' ).checked = this.configuration.mqttSsl;
        document.querySelector( '#devices' ).value = this.configuration.devices;
        document.querySelector( '#speech-recognition-keyword' ).value = this.configuration.speechRecognitionKeyword;
        document.querySelector( '#talkback' ).checked = this.configuration.talkback;

        this.devices = this.configuration.devices.trim().split("\n");
    }

    bindSettings() {
        document.querySelector( '#speech-recognition-threshold' ).addEventListener( 'change', function( ev ) {
            this.configuration.speechRecognitionThreshold = parseFloat( ev.target.value );
            localStorage.setItem( 'speech-recognition-threshold', this.configuration.speechRecognitionThreshold );
        }.bind( this ));

        document.querySelector( '#mqtt-host' ).addEventListener( 'change', function( ev ) {
            this.configuration.mqttHost = ev.target.value.trim()
            localStorage.setItem( 'mqtt-host', ev.target.value.trim() );
        }.bind( this ));

        document.querySelector( '#mqtt-port').addEventListener( 'change', function( ev ) {
            this.configuration.mqttPort = parseInt( ev.target.value );
            localStorage.setItem( 'mqtt-port', parseInt( ev.target.value ) );
        }.bind( this ));

        document.querySelector( '#mqtt-username' ).addEventListener( 'change', function( ev ) {
            this.configuration.mqttUsername = ev.target.value.trim();
            localStorage.setItem( 'mqtt-username', ev.target.value );
        }.bind( this ));

        document.querySelector( '#mqtt-password' ).addEventListener( 'change', function( ev ) {
            this.configuration.mqttPassword = ev.target.value.trim();
            localStorage.setItem( 'mqtt-password', ev.target.value );
        }.bind( this ));

        document.querySelector( '#mqtt-ssl' ).addEventListener( 'change', function( ev ) {
            this.configuration.mqttSsl = ev.target.checked;
            localStorage.setItem( 'mqtt-ssl', ev.target.checked );
        }.bind( this ));

        document.querySelector( '#devices' ).addEventListener( 'change', function( ev ) {
            localStorage.setItem( 'devices', ev.target.value.trim() );
            this.devices = ev.target.value.trim().split( '\n' );
            this.linguistics.updateDevices( this.devices );
        }.bind( this ));

        document.querySelector( '#talkback' ).addEventListener( 'change', function( ev ) {
            this.configuration.talkback = ev.target.checked;
            localStorage.setItem( 'talkback', ev.target.checked );
        }.bind( this ));

        document.querySelector( '#speech-recognition-keyword' ).addEventListener( 'change', function( ev ) {
            localStorage.setItem( 'speech-recognition-keyword', ev.target.value.trim().toLowerCase() );
            this.configuration.speechRecognitionKeyword = ev.target.value.trim().toLowerCase();
            this.linguistics.updateSpeechRecognitionKeyword( this.configuration.speechRecognitionKeyword );
        }.bind( this ));

        document.querySelector( '#mqtt-connect' ).addEventListener( 'click', this.connectMQTT.bind( this ) );
    }

    // -------------------------------------------------------------------------
    // Utility

    talkback( type, transcript ) {
        if ( this.configuration.talkback ) {
            let func = 'talkback';
            if ( type !== false ) {
                func = 'talkback_' + type.toLowerCase();
            }

            if ( typeof this.linguistics[ func ] === 'function' ) {
                this.linguistics[ func ]( transcript );
            }
        }
    }

    log(
        title,
        message,
        data = undefined
    ) {
        let str = `<div class="log-message">
                    ${
                        new Date().toLocaleTimeString()
                    } <b>${title}</b>
                    ${message}
                    ${
                        data !== undefined &&
                        data !== false
                            ?   ' (' +
                                    (   typeof data == 'array'
                                            ? data.join(',')
                                            : data
                                    ) +
                                ')'
                            : ''
                    }`;

        let logEl = document.querySelector( '#log' );
        logEl.innerHTML += str;

        // Cleanup
        let elms = document.querySelectorAll( 'div.log-message' );
        if ( elms.length > 20 ) {
            elms[0].parentNode.removeChild( elms[0] );
        }
    }

}