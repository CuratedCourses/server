$(function() {
    $("input[type='url']").on('input change',function() {
	var value = $(this).val();
	var parent = $(this).parent();

	if (validator.isURL(value)) {
	    parent.addClass('has-success');
	    parent.removeClass('has-error');
	} else {
	    parent.addClass('has-error');
	    parent.removeClass('has-success');
	}
    });
});
