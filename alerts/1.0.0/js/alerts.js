/*![Module-Version]*/
/***************************************************************************************************************************************************************
 *
 * alerts
 *
 * Description of module
 *
 **************************************************************************************************************************************************************/


(function(GUI) {

	var module = {};

	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// module init method
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	module.init = function alertsInit() {
		GUI.debugging( 'alerts: Initiating', 'report' );


		$('.js-alertclose').on('click', function closeAlert() {
			GUI.debugging( 'alerts: Closing alert', 'interaction' );

			var $parent = $(this).parent('.alert');

			$parent
				.addClass('is-closed')
				.attr('aria-hidden', 'true');
		});
	};


	GUI.alerts = module;


	// run module
	GUI.alerts.init();

}(GUI));