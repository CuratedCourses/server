$(function() {
    var licenses = {};

    function updateLicense() {
	var license = $('#license').val().trim();
	var parent = $('#license').parent();

	if (!(licenses[license])) {
	    $('#licenseDescription').hide();
	}
	
	if (license.match(/ OR /)) {
	    parent.removeClass('has-success');
	    parent.removeClass('has-error');
	} else if (licenses[license]) {
	    parent.addClass('has-success');
	    parent.removeClass('has-error');

	    $('#licenseDescription').text( licenses[license].name );
	    $('#licenseDescription').attr( 'href', licenses[license].url );
	    $('#licenseDescription').show();
	} else if (license.match(/[A-z0-9]/)) {
	    parent.addClass('has-error');
	    parent.removeClass('has-success');
	} else {
	    parent.removeClass('has-error');
	    parent.removeClass('has-success');	    
	}
    }
    
    $('#license').on('change input', updateLicense );
    
    $.ajax({url: "/lib/spdx-license-list/spdx.json"})
	.done(function( data ) {
	    licenses = data;
	    updateLicense();
	});
});
