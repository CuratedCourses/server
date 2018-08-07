$(function() {

    applyFilters();
    
    $('#clear-filter').click( function() {
	var filters = $("#filters");
	filters.empty();
	applyFilters();
    });
    
    $('.add-filter').click( function() {
	var e = $(this);
	var property = e.attr('data-filter-property');
	var value =  e.attr('data-filter-value');

	var filters = $("#filters");

	var label = $('<span class="badge badge-pill badge-primary"></span>');
	label.attr('data-filter-property', property);
	label.attr('data-filter-value', value);

	label.click( function() {
	    label.remove();
	    applyFilters();	    
	});

	e.clone(true,true).contents().prependTo( label );

	if (filters.children()
	    .filter( "[data-filter-property='" + property + "']" )
	    .filter( "[data-filter-value='" + value + "']" ).length == 0) {
	    filters.prepend( document.createTextNode(" ") );
	    filters.prepend( label );
	}

	applyFilters();	
    });

    function applyFilters() {
	$('#clear-filter').toggle( $("#filters").children().length > 0 );
	$('#clear-filter .plural').toggle( $("#filters").children().length > 1 );
	
	var filters = {};
	
	$("#filters").children().each( function() {
	    var filter = $(this);
	    var property = filter.attr('data-filter-property');
	    var value =  filter.attr('data-filter-value');

	    if (filters[property])
		filters[property].unshift( value );
	    else
		filters[property] = [value];
	});

	var count = 0;
	$('.asset').each( function() {
	    var asset = $(this);

	    var passes = true;
	    Object.keys(filters).forEach(function (key) {
		var value = asset.attr('data-' + key );
		if (filters[key].indexOf(value) < 0)
		    passes = false;
	    });

	    asset.toggle( passes );
	    if (passes) count = count + 1;
	});

	$('#asset-count').text( count );
	$('#asset-count').siblings('.plural').toggle( count != 1 );
    }
});
