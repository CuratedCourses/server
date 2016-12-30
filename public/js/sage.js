$(function() {
    sagecell.makeSagecell({"inputLocation": ".sage", autoeval: true, hide: ["permalink"]});

    $('button.sagecell_evalButton').addClass('btn');
    $('button.sagecell_evalButton').addClass('btn-primary');
    $('button.sagecell_evalButton').html( "&nbsp;Evaluate" );        
    $('button.sagecell_evalButton').prepend( $("<i class='fa fa-calculator'></i>") );    

    $('.sagecell_permalink button').on('DOMNodeInserted', function () {
	$(this).addClass('btn');
    });
});
