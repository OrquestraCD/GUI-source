'use strict';

//--------------------------------------------------------------------------------------------------------------------------------------------------------------
//
//                                                             ██████╗  ██╗   ██╗ ██╗
//                                                            ██╔════╝  ██║   ██║ ██║
//                                                            ██║  ███╗ ██║   ██║ ██║
//                                                            ██║   ██║ ██║   ██║ ██║
//                                                            ╚██████╔╝ ╚██████╔╝ ██║
//                                                             ╚═════╝   ╚═════╝  ╚═╝
//                                                                       Created by Westpac Design Delivery Team
// @desc     GUI source running each module
// @author   Dominik Wilkowski
// @website  https://github.com/WestpacCXTeam/GUI-source
// @issues   https://github.com/WestpacCXTeam/GUI-source/issues
//--------------------------------------------------------------------------------------------------------------------------------------------------------------


//--------------------------------------------------------------------------------------------------------------------------------------------------------------
// External dependencies
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
var MultiStream = require('multistream')
var Crypto = require('crypto');
var Path = require('path');
var Du = require('du');
var Fs = require('fs');


//--------------------------------------------------------------------------------------------------------------------------------------------------------------
// Custom functions
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
/*
 * Get latest version of a module
 *
 * @param   module  [string]  Module name
 * @param   grunt   [object]  Grunt object
 *
 * @return  [string]  Version string of latest version
 */
function GetLastest( module, grunt ) {
	var GUI = grunt.file.readJSON( '../GUI.json' );
	var latestVersion = '1.0.0';

	Object.keys( GUI.modules ).forEach(function iterateCategories( category ) {

		Object.keys( GUI.modules[category] ).forEach(function iterateModules( moduleKey ) {

			var mod = GUI.modules[category][moduleKey];

			if( module === mod.ID ) {

				//iterate over all versions
				Object.keys( mod.versions ).forEach(function iterateCore( version ) {
					latestVersion = version;
				});

				return;
			}
		});
	});

	return latestVersion;
}


/*
 * Get next version of this module
 *
 * @param   grunt  [object]  Grunt object
 *
 * @return  [string]  Version string of latest version
 */
function GetNextVersion( grunt ) {
	var module = grunt.file.readJSON( 'module.json' );
	var newVersion = GetLastest( module.ID, grunt ).split(".");

	newVersion[ (newVersion.length - 1) ] = parseInt( newVersion[ (newVersion.length - 1) ] ) + 1;

	return newVersion.join(".");
}


/*
 * Get latest version of this module
 *
 * @param   grunt  [object]  Grunt object
 *
 * @return  [string]  Version string of latest version
 */
function GetThisVersion( grunt ) {
	var module = grunt.file.readJSON( 'module.json' );
	var latestVersion = GetLastest( module.ID, grunt );
	var options = module.versions[ latestVersion ];

	options.thisVersion = latestVersion;

	return options;
}


/*
 * Get all core modules
 *
 * @param   grunt    [object]  Grunt object
 * @param   exclude  [string]  ID of module to be excluded
 *
 * @return  [array]  All files needed
 */
function GetCore( grunt, exclude ) {
	var GUI = grunt.file.readJSON( '../GUI.json' );
	var core = {
		js: [],
		less: [],
		BOMfont: [],
		BSAfont: [],
		STGfont: [],
		WBCfont: [],
		size: 0,
	};

	Object.keys( GUI.modules._core ).forEach(function iterateCore( module ) {

		if( module !== exclude ) {
			var version = GetLastest( module, grunt );

			if( GUI.modules._core[module].versions[version].js ) {
				core.js.push('../' + module + '/' + version + '/js/*.js');
			}

			if( GUI.modules._core[module].versions[version].less ) {
				core.less.push('../' + module + '/' + version + '/less/module-mixins.less');
			}

			if( GUI.modules._core[module].versions[version].font ) {
				core.BOMfont.push('../' + module + '/' + version + '/_assets/BOM/font');
				core.BSAfont.push('../' + module + '/' + version + '/_assets/BSA/font');
				core.STGfont.push('../' + module + '/' + version + '/_assets/STG/font');
				core.WBCfont.push('../' + module + '/' + version + '/_assets/WBC/font');
			}

			core.size = parseInt( GUI.modules._core[module].versions[version].size );
		}
	});

	return core;
}


/*
 * Create a checksum for a string
 *
 * @param   str        [string]  String to be decoded
 * @param   algorithm  [string]  Algorithm to be used, Default: sha1
 * @param   encoding   [string]  Encoding to be used, Default: hex
 *
 * @return  [array]  All files needed
 */
function checksum(str, algorithm, encoding) {
	return crypto
		.createHash(algorithm || 'sha1')
		.update(str, 'utf8')
		.digest(encoding || 'hex');
}


//--------------------------------------------------------------------------------------------------------------------------------------------------------------
// Grunt module
//--------------------------------------------------------------------------------------------------------------------------------------------------------------
module.exports = function(grunt) {
	require('../node_modules/grunt-recursively-load-tasks')(grunt);


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Dependencies
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.recursivelyLoadTasks('grunt-contrib-imagemin', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-connect', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-concat', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-watch', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-clean', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-copy', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-contrib-less', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-text-replace', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-lintspaces', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-grunticon', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-prompt', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-wakeup', '../node_modules');
	grunt.recursivelyLoadTasks('grunt-font', '../node_modules');


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Globals
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	moduleName: process.cwd().split('/')[( process.cwd().split('/').length - 1 )], //module name


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Custom grunt task to build all files for each version
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('createChecksum', 'Add a checksum of all folders to the module.json.', function() {
		var sumDone = this.async();
		var hasher = Crypto.createHash('md5');
		var module = grunt.file.readJSON( 'module.json' );
		var streams = [];

		//iterate over all versions
		Object.keys( module.versions ).forEach(function iterateCore( version ) {

			grunt.file.expand({ filter: 'isFile' }, [
					version + '/**/*',
					'!' + version + '/html/**/*',
					'!' + version + '/tests/**/*',
				]).forEach(function( file ) {
					streams.push( Fs.createReadStream( file ) ); //get all relevant files
			});

		});

		MultiStream( streams )
			.on('data', function( data ) {
				hasher.update(data, 'utf8'); //pipe content to hasher
			})
			.on('end', function() {
				var hash = hasher.digest('hex'); //get checksum

				module['hash'] = hash;

				grunt.file.write( 'module.json', JSON.stringify( module, null, "\t" ) );
				grunt.log.ok( hash + ' hash successfully generated' );

				sumDone(true);
			});

	});


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Custom grunt task to calculate the size of each version
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('calculateSize', 'Calculate the size of each version and add it to the module.json.', function() {
		var calDone = this.async();

		var module = grunt.file.readJSON( 'module.json' );
		var core = GetCore( grunt, module.ID );
		var counter = Object.keys(module.versions).length;

		//iterate over all versions
		Object.keys( module.versions ).forEach(function iterateCore( version ) {

			Du(version + '/tests/WBC/assets/', function(err, sizeAssets) {

				Du(version + '/tests/WBC/assets/font/', function(err, sizeFont) {

					Du(version + '/tests/WBC/assets/less/', function(err, sizeLess) {
						sizeAssets = sizeAssets || 0;
						sizeLess = sizeLess || 0;
						sizeFont = sizeFont || 0;

						var size = Math.ceil( ( (sizeAssets - sizeLess - sizeFont - 96000) / 1000 ) - core.size ); //size of test/WBC folder minus core size

						if( size <= 0 ) {
							size = 1;
						}

						var module = grunt.file.readJSON( 'module.json' );

						module.versions[version]['size'] = parseInt( size );
						grunt.file.write( 'module.json', JSON.stringify( module, null, "\t" ) );

						grunt.log.ok( size + 'kb size successfully calculated' );

						counter--;

						if( counter === 0 ) {
							calDone(true);
						}
					});
				});
			});

		});

	});


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Custom grunt task to build all files for each version
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('buildVersions', 'Build all versions in this module.', function() {

		var srcFiles = {};
		var concat = {};
		var less = {};
		var copy = {};
		var font = {};
		var replace = {};
		var imagemin = {};
		var grunticon = {};
		var clean = {};
		var brands = ['BOM', 'BSA', 'STG', 'WBC'];

		var module = grunt.file.readJSON( 'module.json' );
		var core = GetCore( grunt, module.ID );

		//iterate over all versions
		Object.keys( module.versions ).forEach(function iterateCore( version ) {
			var moduleName = module.ID;
			var svgselectors = grunt.file.readJSON(version + '/_assets/grunticon.json');

			//create tasks for each brand
			brands.forEach(function( brand ) {

				//////////////////////////////////////| CONCAT FILES
				srcFiles = core.js.slice(0); //js
				srcFiles.push(version + '/js/*.js');

				concat[ version + 'JS' + brand ] = {
					src: srcFiles,
					dest: version + '/tests/' + brand + '/assets/js/gui.js',
				};

				srcFiles = core.less.slice(0); //less
				srcFiles.push(version + '/less/module-mixins.less');

				concat[ version + 'Less' + brand ] = {
					src: srcFiles,
					dest: version + '/tests/' + brand + '/assets/less/gui.less',
				};

				concat[ version + 'HTML' + brand ] = { //html
					src: [
						version + '/html/header.html',
						version + '/html/source.html',
						version + '/html/footer.html',
					],
					dest: version + '/tests/' + brand + '/index.html',
				};


				//////////////////////////////////////| ADD VERSIONING TO FILES
				replace[ version + 'Replace' + brand ] = {
					src: [
						version + '/tests/' + brand + '/assets/js/*.js',
						version + '/tests/' + brand + '/assets/less/*.less',
						version + '/tests/' + brand + '/*.html',
					],
					overwrite: true,
					replacements: [{
						from: '[Module-Version-Brand]',
						to: moduleName + ' v' + version + ' ' + brand,
					}, {
						from: '[Module-Version]',
						to: moduleName + ' v' + version,
					}, {
						from: '[Brand]',
						to: brand,
					}, {
						from: '[Debug]',
						to: 'true',
					}],
				};

				replace[ version + 'ReplaceTest' + brand ] = {
					src: [
						version + '/less/test.less',
					],
					overwrite: false,
					dest: version + '/tests/' + brand + '/assets/less/test.less',
					replacements: [{
						from: '[Module-Version-Brand]',
						to: moduleName + ' v' + version + ' ' + brand,
					}, {
						from: '[Module-Version]',
						to: moduleName + ' v' + version,
					}, {
						from: '[Brand]',
						to: brand,
					}, {
						from: '[Debug]',
						to: 'true',
					}],
				};


				//////////////////////////////////////| COMPILE LESS
				less[ version + 'Less' + brand ] = {
					options: {
						cleancss: true,
						compress: false,
						ieCompat: true,
						report: 'min',
						plugins : [ new (require('less-plugin-autoprefix'))({ browsers: [ 'last 2 versions', 'ie 8', 'ie 9', 'ie 10' ] }) ],
					},
					src: [
						version + '/tests/' + brand + '/assets/less/gui.less',
					],
					dest: version + '/tests/' + brand + '/assets/css/gui.css',
				};

				less[ version + 'LessTest' + brand ] = {
					options: {
						cleancss: true,
						compress: false,
						ieCompat: true,
						report: 'min',
						plugins : [ new (require('less-plugin-autoprefix'))({ browsers: [ 'last 2 versions', 'ie 8', 'ie 9', 'ie 10' ] }) ],
					},
					src: [
						version + '/tests/' + brand + '/assets/less/test.less',
					],
					dest: version + '/tests/' + brand + '/assets/css/test.css',
				};


				//////////////////////////////////////| COPY FONT ASSETS
				core[ brand + 'font' ].forEach(function( path ) {
					copy[ version + 'CoreFont' + brand ] = {
						expand: true,
						cwd: path,
						src: '*',
						dest: version + '/tests/' + brand + '/assets/font',
					};
				});

				copy[ version + 'Font' + brand ] = {
					expand: true,
					cwd: version + '/_assets/' + brand + '/font',
					src: '*',
					dest: version + '/tests/' + brand + '/assets/font',
				};


				//////////////////////////////////////| OPTIMISE IMAGES
				imagemin[ version + 'Images' + brand ] = {
					options: {
						optimizationLevel: 4,
					},
					files: [{
						expand: true,
						cwd: version + '/_assets/' + brand + '/img/',
						src: ['**/*.{png,jpg,gif}'],
						dest: version + '/tests/' + brand + '/assets/img/',
					}],
				};


				//////////////////////////////////////| HANDLE SVGS
				grunticon[ version + 'SVG' + brand ] = {
					files: [{
						expand: true,
						cwd: version + '/_assets/' + brand + '/svg',
						src: '*.svg',
						dest: version + '/tests/' + brand + '/assets/css',
					}],

					options: {
						datasvgcss: 'symbols.data.svg.css',
						datapngcss: 'symbols.data.png.css',
						urlpngcss: 'symbols.fallback.css',
						cssprefix: '.symbol-',
						pngpath: '../img',
						enhanceSVG: true,
						customselectors: svgselectors,
					},
				};

				copy[ version + 'SVG' + brand ] = {
					expand: true,
					cwd: version + '/tests/' + brand + '/assets/css/png',
					src: '*.png',
					dest: version + '/tests/' + brand + '/assets/img',
				};

				clean[ version + 'SVG' + brand ] = [
					version + '/tests/' + brand + '/assets/css/preview.html',
					version + '/tests/' + brand + '/assets/css/grunticon.loader.js',
					version + '/tests/' + brand + '/assets/css/png/',
				];
			});


			//////////////////////////////////////| SHOW CURRENT VERSION BUILD
			font[ version ] = {
				text: moduleName + '|' + version,
				options: {
					colors: ['white', 'gray'],
				},
			};

		});


		//running tasks
		grunt.config.set('concat', concat);
		grunt.task.run('concat');

		grunt.config.set('replace', replace);
		grunt.task.run('replace');

		grunt.config.set('less', less);
		grunt.task.run('less');

		grunt.config.set('imagemin', imagemin);
		grunt.task.run('imagemin');

		grunt.config.set('grunticon', grunticon);
		grunt.task.run('grunticon');

		grunt.config.set('copy', copy);
		grunt.task.run('copy');

		grunt.config.set('clean', clean);
		grunt.task.run('clean');

		grunt.task.run('calculateSize');
		grunt.task.run('createChecksum');

		grunt.config.set('font', font);
		grunt.task.run('font');

	});


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Custom grunt task to watch all files for each version
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('watchVersions', 'Watch all files in each version.', function() {

		var watch = {};

		var module = grunt.file.readJSON( 'module.json' );

		//iterate over all versions
		Object.keys( module.versions ).forEach(function iterateCore( version ) {

			//create the watch
			watch[ version ] = {
				files: [
					'./' + version + '/**/*.*',
					'!./' + version + '/tests/**/*.*',
				],
				tasks: [
					'_build',
				],
			};

		});


		//running tasks
		grunt.config.set('watch', watch);
		grunt.task.run('watch');

	});


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Grunt tasks
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.initConfig({


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// GLOBALS
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		latestVersion: GetThisVersion( grunt ),


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// ADD NEW VERSION
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		prompt: {
			addNew: { //setup questionnaire
				options: {
					questions: [
						{
							config: 'version',
							type: 'list',
							message: "\n\n" + '		What version would you like to call this?'.magenta + "\n\n",
							choices: [
								{
									value: GetNextVersion( grunt ),
									name: 'Version: ' + GetNextVersion( grunt ).yellow,
								},
								{
									value: 'custom',
									name: 'Version: ' + '?.?.?'.yellow,
								},
							]
						},
						{
							when: function promptCustomversion( answers ) {
								return answers['version'] === 'custom';
							},
							config: 'version',
							type: 'input',
							message: "\n\n" + '		What specific version(?.?.?) would you like it to be?'.magenta + "\n\n",
						},
						{
							config: 'options',
							type: 'checkbox',
							message: "\n\n" + '		What is in your new version?'.magenta + "\n\n",
							choices: [
								{
									value: 'js',
									name: 'Does this version come with ' + 'JS?'.yellow,
									checked: '<%= latestVersion.js %>',
								},
								{
									value: 'less',
									name: 'Does this version come with ' + 'Less?'.yellow,
									checked: '<%= latestVersion.less %>',
								},
								{
									value: 'svg',
									name: 'Does this version come with ' + 'SVGs?'.yellow,
									checked: '<%= latestVersion.svg %>',
								},
								{
									value: 'font',
									name: 'Does this version come with ' + 'webfonts?'.yellow,
									checked: '<%= latestVersion.font %>',
								},
							]
						},
						{
							config: 'dependencies',
							type: 'input',
							message: "\n\n" + '		Does this new version have any new dependencies?'.magenta + "\n\n",
						},
					],
					then: function promptThen( results ) {
						var module = grunt.file.readJSON('module.json');
						var latestVersion = GetLastest( module.ID, grunt );

						// BUILD THE JSON ENTRY
						var options = module.versions[ latestVersion ];
						var dep = options.dependencies;
						var optionJS = options.js;
						var optionLESS = options.less;
						var optionSVG = options.svg;
						var optionFONT = options.font;

						if( results['dependencies'] ) {
							dep.push( results['dependencies'] );
						}

						results['options'].forEach(function iterateOptions( option ) {
							if( option === 'js' ) {
								optionJS = true;
							}

							if( option === 'less' ) {
								optionLESS = true;
							}

							if( option === 'svg' ) {
								optionSVG = true;
							}

							if( option === 'font' ) {
								optionFONT = true;
							}
						});

						module.versions[ results['version'] ] = {
							'dependencies': dep,
							'js': optionJS,
							'less': optionLESS,
							'svg': optionSVG,
							'font': optionFONT,
							'size': 1,
						}

						grunt.file.write( 'module.json', JSON.stringify( module, null, "\t" ) );
						grunt.log.ok( 'Module.json modified.' );


						// COPY FILES
						var copy = {};

						copy[ 'addVersion' ] = {
							expand: true,
							cwd: latestVersion,
							src: '**/*',
							dest: results['version'],
						};

						grunt.config.set('copy', copy);
						grunt.task.run( 'copy' );

					},
				},
			},
		},


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// LINT SPACES
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		lintspaces: {
			all: {
				options: {
					editorconfig: '../.editorconfig',
					ignores: [
						'js-comments',
						'c-comments',
						'java-comments',
						'as-comments',
						'xml-comments',
						'html-comments',
						'python-comments',
						'ruby-comments',
						'applescript-comments',
					],
				},
				src: [
					'**/*.js',
					'**/*.less',
					'**/*.css',
					'**/*.html',

					'!**/tests/**/*.*',
					'!node_modules/**/*.*',
					'!**/*.svg',
					'!Gruntfile.js',
				],
			},
		},


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// Banner
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		font: {
			options: {
				space: false,
				colors: ['white', 'gray'],
			},

			title: {
				text: '| GUI',
			},
		},


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// Wakeup
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		wakeup: {
			wakeme: {
				options: {
					randomize: true,
				},
			},
		},


		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		// server
		//----------------------------------------------------------------------------------------------------------------------------------------------------------
		connect: {
			server: {
				options: {
					open: false,
					hostname: '127.0.0.1',
					port: 1337,
					directory: '../',
					base: '../',
				},
			},
		},

	});



	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Private tasks
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('_build', [
		'lintspaces',
		'buildVersions',
		// 'createChecksum',
		'wakeup',
	]);

	grunt.registerTask('_ubergrunt', [
		'buildVersions',
		// 'createChecksum',
	]);


	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	// Public tasks
	//------------------------------------------------------------------------------------------------------------------------------------------------------------
	grunt.registerTask('default', [
		'font',
		'_build',
		'connect',
		'watchVersions',
	]);

	grunt.registerTask('add', [
		'font',
		'prompt',
		'_build',
		'connect',
		'watchVersions',
	]);

};