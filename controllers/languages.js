var CountryLanguage = require('country-language');
var Country = require('countryjs');

var languages = [];

CountryLanguage.getLanguageCodes(2).forEach( function(code) {
    // "The ISO 639-3 language codes in the range qaa–qtz are
    // 'reserved for local use'. Any organization or person may use
    // them to designate whatever languages they want, as long as they
    // are not mistaken for code assignments in the standard."
    // --Wikipedia
    if (code != 'qaa-qtz') {
	CountryLanguage.getLanguage(code, function (err, language) {
	    if (err) {
		console.log(err);
	    } else {
		// Only include languages spoken in a current country
		if (language.countries.length > 0) {
		    // with a nice name we can display
		    if (language.nativeName[0].length > 0) {
			// Sort countries by population
			language.countries.sort(
			    function(a,b) {
				return Country.population(b.code_2) -
				    Country.population(a.code_2); });

			// Get total population
			var population = language.countries.
			    map( function(c) { return Country.population(c.code_2); } ).
			    reduce( function(a,b) { return (a || 0) + (b || 0); }, 0 );

			// Only include languages with lots of speakers
			if (population > 1000000) {
			    // The flag is reprsented by an iso3166 alpha-2 country code,
			    // of the most populous country speaking that language
			    var flag = language.countries[0].code_2;
			    
			    // I suppose English should be the US flag, despite India being more populous
			    if (language.iso639_1 === "en")
				flag = "US";
			    
			    languages.push({
				code: language.iso639_1, // iso639-1
				flag: flag, // iso3166 alpha-2 code
				nativeName: language.nativeName[0],
				englishName: language.name
			    });
			}
		    }
		}
	    }
	});
    }
});	

module.exports.languages = languages;

module.exports.controller = function (app) {
};
