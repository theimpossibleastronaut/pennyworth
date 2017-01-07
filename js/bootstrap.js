let pwbootstrap = function() {

    if ( document.visibilityState == 'prerender' ) {
        return;
    }

    let speechRecognitionEngine;
    if ( typeof speechRecognition !== 'undefined') {
        speechRecognitionEngine = speechRecognition;
    } else if ( typeof webkitSpeechRecognition !== 'undefined') {
        speechRecognitionEngine = webkitSpeechRecognition;
    } else if ( typeof mozSpeechRecognition !== 'undefined') {
        speechRecognitionEngine = mozSpeechRecognition;
    } else if ( typeof msSpeechRecognition !== 'undefined') {
        speechRecognitionEngine = msSpeechRecognition;
    }

    if ( typeof speechRecognitionEngine !== 'undefined' )  {
        let configuration = {
            'speechLanguage': localStorage.getItem( 'speech-language' ) || 'nl_NL',
            'speechRecognitionEngine': speechRecognitionEngine,
            'speechRecognitionThreshold': localStorage.getItem( 'speech-recognition-threshold' ) || 0.4,
            'speechRecognitionKeyword': localStorage.getItem( 'speech-recognition-keyword' ) || 'alfred',
            'mqttHost': localStorage.getItem( 'mqtt-host' ) || '127.0.0.1',
            'mqttPort': localStorage.getItem( 'mqtt-port' ) || '9001',
            'mqttUsername': localStorage.getItem( 'mqtt-username' ) || '',
            'mqttPassword': localStorage.getItem( 'mqtt-password' ) || '',
            'mqttSsl': ( localStorage.getItem( 'mqtt-ssl' ) + '' == 'true' ),
            'mqttAutoConnect': ( localStorage.getItem( 'mqtt-host' ) && localStorage.getItem( 'mqtt-port' ) ),
            'devices': localStorage.getItem( 'devices' ) || "",
            'linguisticsEngine': linguisticsEngine,
            'talkback': ( localStorage.getItem( 'talkback' ) + '' == 'true' ),
            'talkbackVoice': localStorage.getItem( 'talkback-voice' ) || '',
            'domoticz': {
                channelIn: 'domoticz/in',
                channelOut: 'domoticz/out'
            }
        };

        new pennyworth( configuration );
    } else {
        console.error( 'No speech recognition engine available' );
    }
};

if ( document.readyState != 'loading' ) {
    pwbootstrap();
} else {
    document.addEventListener( 'DOMContentLoaded', pwbootstrap );
}