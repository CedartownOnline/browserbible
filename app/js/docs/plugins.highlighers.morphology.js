	
/**
 * Original language options
 *
 * @author John Dyer (http://j.hn/)
 */
 
docs.plugins.push({

	init: function(content) { 	
	
		content.delegate('span.w', 'mouseover', function() {
			
			var word = $(this),
				lemma = word.attr('data-lemma'),
				lemmaParts = lemma != null ? lemma.split(' ') : [],
				morph = word.attr('data-morph'),
				morphParts = morph != null ? morph.split(' ') : [],
				displayTextArray = [],
				strongLetter = '',
				strongInfo = '',
				strongKey = '',
				strongNumber = 0, 
				strongData = {}; 
			
			if (lemmaParts.length > 0) {
				
				for (var i=0, il=lemmaParts.length; i<il; i++) {
					strongInfo = lemmaParts[i].replace('strong:','');
					strongLetter = strongInfo.substring(0,1);
					strongNumber = parseInt(strongInfo.substring(1), 10);
					strongKey = strongLetter + strongNumber.toString();
					morph = (i< morphParts.length) ? morphParts[i].replace('robinson:','') : '';
						
					if (strongLetter == 'H')
						strongData = strongsHebrewDictionary[strongKey];
					else if (strongLetter == 'G')
						strongData = strongsGreekDictionary[strongKey];
					
					if (typeof strongData != 'undefined') {
						displayTextArray.push( '<span class="lex-entry"><span class="lemma ' + (strongLetter == 'H' ? 'hebrew' : 'greek') + '">' + strongData.lemma + '</span> <span class="strongs-number">(' + strongKey + ')</span> - <span class="definition">' + strongData.strongs_def + '</span>' +(strongLetter == 'G' && morph != '' ? ' <span class="morphology">[' + bible.morphology.Greek.getMorphology( morph ) + ']</span>' : '') );
					}
					
					
				}
				
				word
					.closest('.document-container')
					.find('.document-footer')
					.html(displayTextArray.join('; '));
						
			
			}
					
		});
		
	}
});