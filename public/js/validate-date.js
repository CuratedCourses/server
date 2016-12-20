$(function() {
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
    
    var datepicker = $('input', '.datepicker');
    var parent = datepicker.parent();

    datepicker.on('input change', function() {
	var format = datepicker.attr('placeholder');
	var value = datepicker.val();
	
	if (moment(value, format, true).isValid()) {
	    parent.addClass('has-success');
	    parent.removeClass('has-error');
	} else {
	    parent.addClass('has-error');
	    parent.removeClass('has-success');
	}
    });
});
