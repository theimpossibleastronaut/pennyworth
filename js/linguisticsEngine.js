class linguisticsEngine {
    constructor(
        speechRecognitionEngine,
        language = 'nl_NL',
        speechRecognitionKeyword = 'alfred',
        devices = []
    ) {
        this.speechRecognitionEngine = speechRecognitionEngine;
        this.language = language;
        this.speechRecognitionKeyword = speechRecognitionKeyword;
        this.devices = devices;

        this.speechGrammarListClass;
        if ( typeof SpeechGrammarList !== 'undefined') {
            this.speechGrammarListClass = SpeechGrammarList;
        } else if ( typeof webkitSpeechGrammarList !== 'undefined') {
            this.speechGrammarListClass = webkitSpeechGrammarList;
        } else if ( typeof mozSpeechGrammarList !== 'undefined') {
            this.speechGrammarListClass = mozSpeechGrammarList;
        } else if ( typeof msSpeechGrammarList !== 'undefined') {
            this.speechGrammarListClass = msSpeechGrammarList;
        }

        this.buildGrammar();
    }

    updateDevices( devices ) {
        this.devices = devices;
        this.updateGrammar();
    }

    updateSpeechRecognitionKeyword( keyword ) {
        this.speechRecognitionKeyword = keyword;
        this.updateGrammar();
    }

    updateGrammar() {
        this.buildGrammar();
    }

    buildGrammar() {

        if ( this.devices.length < 1 || this.devices[ 0 ].trim() == '' ) {
            return;
        }

        let grammarHeader = '#JSGF V1.0;';
        let namespace = 'pennyworth';
        let deviceList = [];

        // --
        for ( let deviceString of this.devices ) {
            var device = deviceString.trim().split( ',' )[1].toLowerCase();
            deviceList.push( device );

            if ( device.indexOf( '_' ) > -1 ||
                 device.indexOf( '-' ) > -1 ||
                 device.indexOf( ' ' ) > -1 ) {
                deviceList.push(
                    device
                        .split( '_' ).join( '' )
                        .split( '-' ).join( '' )
                        .split( ' ' ).join( '' ),
                    device
                        .split( '_' ).join( ' ' )
                        .split( '-' ).join( ' ' )
                );
            }
        }
        // --

        let keywordGrammarString = `${grammarHeader}
        grammar ${namespace}.keyword;
        public <keyword> = ${this.speechRecognitionKeyword}`;

        let devicesGrammarString = `${grammarHeader}
        grammar ${namespace}.device;
        public <device> = ${deviceList.join( ' | ' )}`;

        let sentenceGrammarString = `${grammarHeader}
        grammar ${namespace}.sentence;
        import <pennyworth.*>;
        public <actions> = aan | uit | inschakelen | uitschakelen | open | sluiten | openen;
        public <sentence> = <keyword> <device>+ <actions>`;

        let grammarList = new this.speechGrammarListClass();
        grammarList.addFromString( keywordGrammarString, 0.8 );
        grammarList.addFromString( devicesGrammarString, 0.8 );
        grammarList.addFromString( sentenceGrammarString, 1.0 );

        this.speechRecognitionEngine.grammars = grammarList;
    }

    analyze( string ) {
        let obj = {
            'error': false,
            'src': string,
            'matchedDeviceNames': [],
            'matchedDevices': [],
            'action': false
        };

        let lString = string.toLowerCase();

        for ( let deviceString of this.devices ) {
            let deviceRow = deviceString.trim().split( ',' );
            let device = deviceRow[1].toLowerCase();
            let isMatch = false;

            if ( lString.indexOf( device ) > -1 ||
                 lString.indexOf( device.split( '_' ).join(' ') ) > -1 ||
                 lString.indexOf( device.split( '_' ).join('') ) > -1 ||
                 lString.indexOf( device.split( '-' ).join(' ') ) > -1 ||
                 lString.indexOf( device.split( '-' ).join('') ) > -1 ||
                 lString.indexOf( device.split( ' ' ).join('') ) > -1
               ) {
                isMatch = true;
            }

            if ( isMatch ) {
                obj.matchedDeviceNames.push( device );
            }
        }

        obj.matchedDeviceNames.sort( function( a, b ) {
            return b.length - a.length || a.localeCompare( b );
        } );

        // Nasty
        for ( let deviceName of obj.matchedDeviceNames ) {
            for ( let devRow of this.devices ) {
                if ( devRow.toLowerCase().indexOf( ',' + deviceName.toLowerCase() + ',' ) > -1 ) {
                    obj.matchedDevices.push( devRow );
                }
            }
        }

        // Nasty 2
        if ( string.lastIndexOf( 'aan' ) > -1 ||
             string.lastIndexOf( 'inschakelen' ) > -1 ) {
            obj.action = 'aan';
        }

        if ( string.lastIndexOf( 'uit' ) > -1 ||
             string.lastIndexOf( 'uitschakelen' ) > -1 ) {
            obj.action = 'uit';
        }

        if ( string.lastIndexOf( 'open' ) > -1 ||
             string.lastIndexOf( 'openen' ) > -1 ) {
            obj.action = 'open';
        }

        if ( string.lastIndexOf( 'dicht' ) > -1 ||
             string.lastIndexOf( 'sluiten' ) > -1 ) {
            obj.action = 'dicht';
        }

        return obj;
    }

    talkback_notsure( transcript ) {
        this.talkback( 'Wat bedoel je met:' + transcript );
    }

    talkback_confirm( transcript ) {
        this.talkback( 'Bevestigd:' + transcript );
    }

    talkback( string ) {
        var utt = new SpeechSynthesisUtterance( string );
        utt.lang = this.language.split( '_' ).join( '-' );

        let ss = window.speechSynthesis;
        ss.speak( utt );
    }
}