//var $ = require('jquery');
//require('jquery-ui');

function preventVerticalOverlap(marginBlocks) {
    // Sort the marginBlocks in order of appearance in the margin.
    //
    // This probably isn't necessary because marginBlocks was
    // presumably given to us in the order of the DOM, but there's no
    // reason not to be careful.
    marginBlocks = marginBlocks.sort( function(a,b) {
	if ($(a).position().top < $(b).position().top ) {
	    return -1;
	} else {
	    return 1;
	}
    });
    
    // Walk through the margin blocks,,,
    var previous = undefined;
    marginBlocks.each( function() {
	if (previous != undefined) {
	    // If the previous one extends into the current one...
	    if ( (previous.position().top + previous.height()) > $(this).position().top) {
		// Push the current one down
		$(this).css( 'margin-top', (previous.position().top + previous.height()) - $(this).position().top );
	    }
	}
	
	previous = $(this);
    });
}

$(function() {
    // All of the following code was written with the assumption that we're displaying marginblocks on an MBX page,
    // but actually we don't need to make that much of an assumption
    var blockCount = 0;
    
    // Walk through all the listed outcomes...
    $('span.curated-courses.outcome').each( function() {
	// Find the surrouding block-level element in the text
	var parent = $(this).parents().filter(function() {
	    return $(this).css("display") === "block";
	}).first();
	
	// Find the corresponding marginblock...
	var id = $(parent).data( 'curated-courses-id' );
	if ( ! id ) {
	    // or create a marginblock if it doesn't exist
	    var block = $('<div class="curated-courses"></div>');
	    $(parent).before( block );
	    block.css( 'position', 'absolute' );

	    // If the parent block is wide (like the width of the
	    // window!) then this is going to end with our marginblock
	    // causing a scrollbar to appear; it'd be better to react
	    // to this and have the marginblock sit in the main body
	    // text to avoid the scrollbar from appearing.
	    block.css( 'margin-left', $(parent).width() );
	    // provide a bit of breathing room
	    block.css( 'padding-left', '12pt' ); 
	    block.css( 'margin-top', '0px' );

	    // This is a shim for $(block).uniqueId();
	    if (! ($(block).attr('id')) ) {
		$(block).attr( 'id', 'cc-id-' + blockCount.toString() );
		blockCount = blockCount + 1;
	    }

	    // Marginblocks should know about the parent in the running text...
	    // BADBAD: This should use uniqueId to enforce a link from the marginblock to the parent
	    if ($(parent).attr('id')) {
		$(block).data( 'parent-id', $(parent).attr('id') );
	    }

	    // The running text should know about the marginblock
	    id = $(block).attr('id');
	    $(parent).data( 'curated-courses-id', id );
	}
	var block = $("#" + id);

	// The marginblock's "outcomes" data attribute receives a list of all the outcomes
	var outcomes = $(block).data( 'outcomes' );
	if ( ! outcomes ) {
	    outcomes = [];
	}
	outcomes.push( $(this).text() );
	$(block).data( 'outcomes', outcomes );

	// BADBAD: for the time being, create a placeholder
	var outcome = $('<span class="curated-courses outcome"></span>');
	outcome.text( $(this).text() );
	outcome.css( 'display', 'block' );
	block.append( outcome );
	//outcome.css( 'margin-top', '15pt' );

	var tag = $(this).text();

	var link = $('<a></a>');
	link.attr( 'href', 'https://curatedcourses.org/' + tag.replace(/\./g,'/') );
	link.text( 'nicer link' );
	block.append( link );
	
	$.getJSON( "//curatedcourses.org/" + tag.replace(/\./g,'/'),
		   function(data) {
		       console.log( data );
		       outcome.text( data );
		   }).fail(function() {
		   });
    });

    $('div.curated-courses').each( function() {
	var block = $(this);

	var link = $('<a></a>');
	url = window.location;
	// BADBAD: this should be anchored not necessarily to the parent, but to the tightest section
	if (block.data('parent-id'))
	    url = url + "#" + block.data('parent-id');
	link.text( url );
	link.attr( 'href', url );
	link.css( 'display', 'block' );
	//block.append( link );
	// This is also a chance to send curatedcourses.org information ABOUT this resource
    });
    
    preventVerticalOverlap( $('div.curated-courses') );
});
