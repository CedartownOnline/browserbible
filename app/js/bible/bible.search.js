/**
 * Loads HTML bible files and searches them for text (RegExp).
 * Requires jQuery for AJAX
 *
 * @author John Dyer (http://j.hn/)
 */

bible.exclusions = {
	"en": [
		// prepositions
"a",
"abaft",
"aboard",
"about",
"above",
"absent",
"across",
"afore",
"after",
"against",
"along",
"alongside",
"amid",
"amidst",
"among",
"amongst",
"an",
"anenst",
"apud",
"around",
"as",
"aside",
"astride",
"at",
"athwart",
"atop",
"barring",
"before",
"behind",
"below",
"beneath",
"beside",
"besides",
"between",
"beyond",
"but",
"by",
"circa",
"concerning",
"despite",
"down",
"during",
"except",
"excluding",
"failing",
"following",
"for",
"forenenst",
"from",
"given",
"in",
"including",
"inside",
"into",
"lest",
"like",
"minus",
"modulo",
"near",
"next",
"notwithstanding",
"of",
"off",
"on",
"onto",
"opposite",
"out",
"outside",
"over",
"pace",
"past",
"per",
"plus",
"pro",
"qua",
"regarding",
"round",
"sans",
"save",
"since",
"than",
"through",
"throughout",
"till",
"to",
"toward",
"towards",
"under",
"underneath",
"unlike",
"until",
"unto",
"up",
"upon",
"versus",
"via",
"with",
"within",
"without",
"worth"			
	]
};


bible.BibleSearch = {
		
	isSearching: false,
	
	canceled: false,
	
	bookOsisID: '',
	
	chapterIndex: 0,
	
	searchText: '',
	
	searchRegExp: null,
	
	highlightRegExp: null,
	
	allAsciiRegExp: new XRegExp('^[\040-\176]*$', 'gi'),
	
	verseRegExp: new XRegExp('<span class="verse[^>]*?>(.)*?</span>(\r|\n)', 'gi'),
	
	verseNumRegExp: new XRegExp('\\w{1,6}\\.\\d{1,3}\\.\\d{1,3}','gi'),
	
	//stripNotesRegExp: new RegExp('<span class="(note|cf)">.+?</span>','gi'),
	stripNotesRegExp: new XRegExp('<span class="(note|cf)">.+?<span class="key">.+?</span><span class="text">.+?</span></span>','gi'),
	
	replaceLexRegExp: new XRegExp('<span class="word"[^>]+>(.+?)</span>','gi'),
	
	resultCount: 0,
	
	startTime: null,
	
	searchResultsArray: [],
	
	version: '',
	
	isLemmaSearch: false,
	
	basePath: 'content/bibles/',
	
	indexedChapters: [],
	
	indexedChaptersIndex: -1,
	
	searchType: 'single', // single, multiple, exact
	
	search: function(text, version, chapterCallback, endedCallback) {
		
		var s = this;
		
		
		if (s.isSearching)
			return;
		
		// save variables
		s.searchText = text;
		
		s.version = version;
		s.chapterCallback = chapterCallback;
		s.endedCallback = endedCallback;
	
		// reset variables
		
		s.canceled = false;
		s.resultCount = 0;
		s.startTime = new Date();
		s.searchResultsArray = [];
		s.indexedChapters = [];
		s.indexedChaptersIndex = -1;
		s.bookOsisID = bible.DEFAULT_BIBLE[0];
		s.chapterIndex = 0;
	
		
		// SETUP REGEX For next word
		
		// all ASCII
		s.allAsciiRegExp.lastIndex = 0;
		if (s.allAsciiRegExp.test( s.searchText )) {
			
			var andSearchParts = s.searchText.split(/\sAND\s/gi);
			s.searchRegExp = [];
			for (var i=0, il=andSearchParts.length; i<il; i++) {
			
				var part = andSearchParts[i];
				
				if (part.substring(0,1) == '"' && part.substring(part.length-1) == '"') {
					part = part.split(' OR ').join('|');
					part = part.replace(/"/gi,'');
					part = part.replace(/ /gi,'[\\s\\.,"\';:]+');
			
					s.searchRegExp.push( new XRegExp('\\b(' + part + ')\\b', 'gi') );
				} else {
				
					part = part.split(' OR ').join('|');
					part = part.split(' ').join('|');
				
					s.searchRegExp.push( new XRegExp('\\b(' + part + ')\\b', 'gi') );
				}
			}			
			
			console.log('SEARCH', s.searchRegExp);
		
			//var parts = term.split(' ').join('|');
		
			//s.searchRegExp = new XRegExp('\\b(' + term.split(' ').join('|') + ')\\b', 'gi');
		}
		// non-ASCII characters
		else {
			
			console.log('non ASCII');
		
			s.searchRegExp = [new XRegExp(s.searchText, 'gi')];
		}		
		
		//s.searchByData();
		s.checkForIndexes();	
	
	},
	
	checkForIndexes: function() {
	
		var s = this;
		
		s.searchTerms = s.searchText.replace(/\sAND\s/gi,' ').replace(/\sOR\s/gi,' ').replace(/"/g,'').split(' ');
		s.searchTermsIndex = -1;
		
		// create an index of just the chapters (John.1) instead of all the verses (John.1.1 and John.1.7)
		s.indexedChapters = []
		s.osisBookMatches = {};
		
		s.loadNextIndex();
		
	},
	
	loadNextIndex: function() {
	
		var s = this;
		
		s.searchTermsIndex++;
		
		if (s.searchTermsIndex == s.searchTerms.length) {
		
			// reset the final list of OSIS chapters we are going to load
			s.indexedChapters = [];
			
			// create unique indexed chapters
			for (var i=0, il=bible.DEFAULT_BIBLE.length; i<il; i++) {
				var bookOsis = bible.DEFAULT_BIBLE[i],
					bookChapters = s.osisBookMatches[bookOsis];
					
				if (typeof bookChapters != 'undefined') {
					for (var j=0, jl=bookChapters.length; j<jl; j++) {
						
						s.indexedChapters.push(bookOsis + '.' + bookChapters[j]);
					}
				}
			}
		
				
			if (s.indexedChapters.length > 0) {		
				// set the first one
				s.indexedChaptersIndex = 0;
				s.bookOsisID = s.indexedChapters[s.indexedChaptersIndex].split('.')[0];
				s.chapterIndex = parseInt(s.indexedChapters[s.indexedChaptersIndex].split('.')[1])-1;	
			}
			
			console.log( 'loaded indexes', s.indexedChapters);
			
			s.isSearching = true;
			s.nextChapter();				
		
			return;
		}
		
		var
			term = s.searchTerms[s.searchTermsIndex],
			indexUrl = s.basePath + s.version + '/index/' + term + '.json';
			
		console.log('Loading Index:' + term);	
			
		// attempt to load in index
		$.ajax({
			url: indexUrl,
			success: function(data) {
				
				for (var i=0, il=data.length; i<il; i++) {
					var verseOsis = data[i],
						verseParts = verseOsis.split('.'),
						bookOsis = verseParts[0],
						chapterNumber = verseParts[1],
						
						bookCheck = s.osisBookMatches[bookOsis];
						
					if (typeof bookCheck == 'undefined') {
						s.osisBookMatches[bookOsis] = [chapterNumber];
					} else {
						if (bookCheck.indexOf(chapterNumber) == -1) {
							bookCheck.push(chapterNumber);
						}
					}
				}			
				
				
				s.loadNextIndex();

			}, 
			error: function() {
				console.log('no index for: ' + term);
				s.loadNextIndex();
			}
		
		});
	
	},
	
	searchByData: function() {
		
		var s = this;
		
		// compile regexp
		s.isLemmaSearch = /(G|H)\d{1,5}/.test(s.searchText);
			
		if (s.isLemmaSearch) {
			//this.searchRegExp = new XRegExp('<span class="[^"]*?' + text + '[^"]*?"[^>]*?>.*?</span>', 'gi');
			
			if (text.substring(0,1) == 'H') {
				s.bookOsisID = bible.DEFAULT_BIBLE[0];
			} else {				
				s.bookOsisID = bible.DEFAULT_BIBLE[40];
			}
			
		} else {
			//this.searchRegExp = new XRegExp('\\b' + text + '\\b', 'gi');
		}
		
		// <span class="[^"]*?G3056[^"]*?"[^>]*?>(.*?)</span> = Strong's
		//this.highlightRegExp = new RegExp('\\b' + text + '\\b', 'gi');
		
		s.isSearching = true;
		s.loadChapter();
	},
	
	cancelSearch: function() {
		this.isSearching = false;
		this.canceled = true;
	},
	
	loadChapter: function() {
		
		var s = this,
			chapterUrl = s.basePath + s.version + '/' + (s.bookOsisID + '.' + (s.chapterIndex+1)) + '.html';
		
		s.chapterCallback(s.bookOsisID, s.chapterIndex, s.resultCount, s.startTime);
		
		$.ajax({
			url: chapterUrl,
			dataType: 'html',
			success: function(data) {
				
				s.textSearch(data);
				
				// move on or cancel
				if (!s.canceled) {
					s.nextChapter();
				} else {
					console.log('CANCELLED: stopping...');
					//s.nextTerm();
					s.ended();
				}
			},
			error: function(e) {
				s.nextChapter();
			}
		});			
	},
	
	textSearch: function(data) {

		

		
		//data = data.replace( new RegExp('<br>','gi'), '');
		
		// remove Lex/Morph data
		// <span class="word" data-morph="">XXX</span>
		//data = data.replace( this.replaceLexRegExp, '$1');
		
		
		
		
		var s = this;
				
		s.verseRegExp.lastIndex = 0;
		s.stripNotesRegExp.lastIndex = 0;
				
		
		// remove notes
		// <dl class="note"></dl>
		// <dl class="cf"></dl>
		//data = data.replace( s.stripNotesRegExp, '' );		
		
		var
			verses = data.match(s.verseRegExp),
			i, il,
			verseSpan,
			verseReferenceText,
			foundMatches = [],
			foundMatch = false,
			matches,
			j, jl;
			
		if (verses != null && verses.length > 0) {
			// go through all the verses
			for (i=0, il=verses.length; i<il; i++) {
				
				// TODO: remove extra HTML to allow searches for "Jesus Wept"
				verseSpan = verses[i];
				foundMatches = [s.searchRegExp.length];
				

				for (var j=0, jl=s.searchRegExp.length; j<jl; j++) {
					
					foundMatches[j] = false;
					s.searchRegExp[j].lastIndex = 0;
				
					// do highlighting
					if (s.isLemmaSearch) {
						verseSpan = verseSpan.replace(s.searchRegExp[j], function(str, p1, p2, offset, s) {
							foundMatches[j] = true;
							return ' ' + str + ' highlight ';
						});				
						
					} else {
						verseSpan = verseSpan.replace(s.searchRegExp[j], function(match) {
							foundMatches[j] = true;
							return '<span class="highlight">' + match + '</span>';
						});
					}
				}
				
				// see if all matched
				foundMatch = true;
				for (var j=0, jl=foundMatches.length; j<jl; j++) {
					if (foundMatches[j] == false) {
						foundMatch = false;
					}
				}
				
				if (foundMatch) {
					verseReferenceText = new bible.Reference( verseSpan.match( s.verseNumRegExp )[0] ); //.toString();
					//console.log(verse);
					
					// put it altogether for a row
					html = '<div class="search-result"><span class="search-verse">' + verseReferenceText + '</span>' + verseSpan + '</div>';
					
					// store results
					s.searchResultsArray.push( html );
					s.resultCount++;
				}				
				
			}
		}

	},
	
	nextChapter: function() {
		
		var s = this;
		
		// loading only the chapters that were indexed
		if (s.indexedChapters.length > 0) {
			
			// move to the next on
			s.indexedChaptersIndex++;
		
			// check if that was the last one
			if (s.indexedChaptersIndex === s.indexedChapters.length) {
				//s.nextTerm();
				s.ended();
				return;
			}
			
			// move to the next one
			s.bookOsisID = s.indexedChapters[s.indexedChaptersIndex].split('.')[0];
			s.chapterIndex = parseInt(s.indexedChapters[s.indexedChaptersIndex].split('.')[1])-1;				
		
		// loading all chapters
		} else {
		
			// more chapters?
			if (this.chapterIndex < bible.BOOK_DATA[this.bookOsisID].chapters.length-1 ) {
				this.chapterIndex++;
			} else {
				
				this.chapterIndex = 0;
				
				// check for last book!
				if ( bible.DEFAULT_BIBLE.indexOf( this.bookOsisID ) == bible.DEFAULT_BIBLE.length-1 ) {

					//s.nextTerm();
					this.ended();
					return;
				} else {
					
					// go forward one book
					this.bookOsisID = bible.DEFAULT_BIBLE[ bible.DEFAULT_BIBLE.indexOf( this.bookOsisID )+1 ];
					
				}
			}
		}
			
		// IE errors out without this
		setTimeout(function() {
			s.loadChapter();
		}, 1);
		
	},
	
	ended: function() {		
		this.isSearching = false;
		
		this.endedCallback(this.searchResultsArray.join(''), this.resultCount, this.startTime);
		
		this.searchResultsArray = null;
		
		//results.html( this.searchResultsArray.join('') );	
	}
};