$(function() {
    var button = $('#save-button');
    var form = button.closest('form');

    function markUnsaved() {
	$('#unsaved').show();
	$('#saving').hide();		
	$('#saved').hide();
	$('#saving').removeClass('hidden');
	$('#saved').removeClass('hidden');
    }

    markUnsaved();
    
    $('input', form).on('change input', markUnsaved );
    
    button.click( function(event) {
	$.ajax({
            type: 'PUT',
            url: form.attr('action'),
            data: form.serialize(),
	    beforeSend: function() {
		$('i', button).removeClass( 'fa-save' );
		$('i', button).addClass( 'fa-spinner fa-pulse' );
		
		$('#unsaved').hide();
		$('#saving').show();		
		$('#saved').hide();		
	    },
            success: function (data) {
		if (data.err) {
		    button.css('background','red');
		} else {
		    $('i', button).addClass( 'fa-save' );
		    $('i', button).removeClass( 'fa-spinner fa-pulse' );
		    
		    $('#unsaved').hide();
		    $('#saving').hide();		
		    $('#saved').show();

		    window.setTimeout( markUnsaved, 5000);
		}
            }
        });
	
        event.preventDefault();	
    });
});
