$(function() {
    /****************************************************************/
    /* Create pickers */

    $.fn.datetimepicker.defaults.icons = {
	time: 'fa fa-clock-o',
	date: 'fa fa-calendar',
	up: 'fa fa-chevron-up',
	down: 'fa fa-chevron-down',
	previous: 'fa fa-angle-double-left',
	next: 'fa fa-angle-double-right',
	today: 'fa fa-dot-circle-o',
	clear: 'fa fa-trash',
	close: 'fa fa-times'
    };
    
    $('.datepicker').datetimepicker({format: 'MM/DD/YYYY'});

    /****************************************************************/
    /* Add validators */
    
    var datepicker = $('input', '.datepicker');
    
    datepicker.on('input change', function() {
	var datepicker = $(this);
	var parent = datepicker.parent();
	var value = datepicker.val().trim();

	if (value.match(/[A-z0-9]/)) {
	    var format = datepicker.attr('placeholder');
	
	    if (moment(value, format, true).isValid()) {
		parent.addClass('has-success');
		parent.removeClass('has-error');
	    } else {
		parent.addClass('has-error');
		parent.removeClass('has-success');
	    }
	} else {
	    parent.removeClass('has-error');
	    parent.removeClass('has-success');
	}
    });
});
