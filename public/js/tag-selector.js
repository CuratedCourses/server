$(function() {
    $('#taglist-drag-help').hide();		
    $('#taglist-select-help').show();
    
    var tags = [];
    var textbook = {};

    // Some reference counting in case a tag appears multiple times in the multiselect tree
    var selections = {};
    
    $.getJSON("/tags", function( data ) {
	tags = data;

	var oldTags = $('input[type="hidden"][name="tags"]').val().split(',');

	function updateHelp() {
	    if ($('#taglist li').length == 0) {
		$('#taglist-drag-help').hide();		
		$('#taglist-select-help').show();
	    }

	    if ($('#taglist li').length == 1) {
		$('#taglist-drag-help').hide();		
		$('#taglist-select-help').hide();
	    }	    

	    if ($('#taglist li').length > 1) {
		$('#taglist-drag-help').show();		
		$('#taglist-select-help').hide();
	    }	    
	}

	function saveTags() {
	    var result = [];
	    
	    $('#taglist li').each( function() {
		result.push( $(this).attr('data-tag') );
	    });
	    
	    $('input[type="hidden"][name="tags"]').val( result.join(',') );
	}
	
	$('#taglist').bind('sortupdate', function(e, ui) { saveTags(); updateHelp(); } );

	/****************************************************************/
	/* Filtering */
	
	var searchbox = $('#tag-search');
	
	function updateSearch() {
	    var search = searchbox.val();
	    console.log(search);

	    if (search.match(/[A-z0-9]/)) {
		$('#filtered-tags').empty();

		var regexps = search.toLowerCase().split(" ").map( function(w) { return new RegExp(w); } );

		var nodes = [];
		
		tags.forEach( function(t) {
		    if (t._id.match(/CCSS/)) return;

		    var text = t.description + '&nbsp;<small><span class="label label-default">' + t._id + '</span></small>';
		    for ( let re of regexps ) {
			if (!(re.test(text.toLowerCase())))
			    return;
		    }
		    
		    var state = undefined;
		    if (selections[t._id])
			state = {selected: true};
		    nodes.push( { text: text, tag: t, state: state } );
		});
		
		$('#filtered-tags').treeview({data: nodes,
					      levels: 0,
					      multiSelect: true});

		$('#filtered-tags').on('nodeSelected', function(event, node) {
		    if ($('#taglist li[data-tag="' + node.tag._id + '"').length == 0) {
			
			if (selections[node.tag._id])
			    selections[node.tag._id]++;
			else
			    selections[node.tag._id] = 1;
			
			var item = $('<li data-tag="' + node.tag._id + '" class="list-group-item">' + node.text + "</li>");
			$('#taglist').append( item );
			$('#taglist').sortable({placeholderClass: 'list-group-item'});
			saveTags();
			updateHelp();
		    }
		});
		
		$('#filtered-tags').on('nodeUnselected', function(event, node) {
		    selections[node.tag._id]--;
		    if (selections[node.tag._id] <= 0) {
			$('#taglist li[data-tag="' + node.tag._id + '"').remove();
			saveTags();
			updateHelp();		    
		    }
		});	    
		
		
		$('.from-textbook').hide();
		$('.from-tagsearch').show();		
	    } else {
		$('.from-textbook').show();
		$('.from-tagsearch').hide();
	    }
	}
	updateSearch();
	searchbox.change(updateSearch);
	searchbox.on('keyup',updateSearch);	

	
	/****************************************************************/
	/* Textbook view */
	
	$.getJSON("/textbooks/lay", function( data ) {
	    textbook = data;

	    oldTags.forEach( function(tagId) {
		var t = tags.filter( function(tag) { return tag._id == tagId; } )[0];
		if (t) {
		    var text = t.description + '&nbsp;<small><span class="label label-default">' + t._id + '</span></small>';
		    var item = $('<li data-tag="' + t._id + '" class="list-group-item">' + text + "</li>");
		    $('#taglist').append( item );
		    $('#taglist').sortable({placeholderClass: 'list-group-item'});
		    selections[t._id] = 1;
		}
	    });	    
	    
	    var tree = [];
	    textbook.sections.forEach( function(chapter) {
		var c = {};
		c.text = '<small class="text-muted">' + chapter.number + '</small> ' + chapter.title;
		c.selectable = false;
		c.nodes = [];
		tree.push(c);
		chapter.sections.forEach( function(section) {
		    var s = {};
   		    s.text = '<small class="text-muted">' + section.number + '</small> ' + section.title;		    
		    s.selectable = false;
		    c.nodes.push(s);
		    s.nodes = [];
		    if (section.tags) {
			section.tags.forEach( function(tagId) {
			    var t = tags.filter( function(tag) { return tag._id == tagId; } )[0];
			    if (t) {
				var text = t.description + '&nbsp;<small><span class="label label-default">' + t._id + '</span></small>';
				var state = undefined;
				if (selections[t._id])
				    state = {selected: true};
				s.nodes.push( { text: text, tag: t, state: state } );
			    }
			});
		    }
		    if (s.nodes.length == 0)
			delete s.nodes;
		});
		if (c.nodes.length == 0)
		    delete c.nodes;
	    });
	    
	    $('#tree').treeview({data: tree,
				 levels: 1,
				 multiSelect: true});
	    
	    $('#tree').on('nodeSelected', function(event, node) {
		if ($('#taglist li[data-tag="' + node.tag._id + '"').length == 0) {
		    
		    if (selections[node.tag._id])
			selections[node.tag._id]++;
		    else
			selections[node.tag._id] = 1;
		    
		    var item = $('<li data-tag="' + node.tag._id + '" class="list-group-item">' + node.text + "</li>");
		    $('#taglist').append( item );
		    $('#taglist').sortable({placeholderClass: 'list-group-item'});
		    saveTags();
		    updateHelp();
		}
	    });

	    $('#tree').on('nodeUnselected', function(event, node) {
		selections[node.tag._id]--;
		if (selections[node.tag._id] <= 0) {
		    $('#taglist li[data-tag="' + node.tag._id + '"').remove();
		    saveTags();
		    updateHelp();		    
		}
	    });	    


	});	    
    });


});
