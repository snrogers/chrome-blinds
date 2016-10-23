/// <reference path='typings/main.d.ts' />

var browserify = require('browserify');
var gulp = require('gulp');
var merge = require('merge2');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tsConfig = require("tsconfig-glob");
var tsProject = ts.createProject('./src/tsconfig.json');
var watch = require('gulp-watch');


/*
 update tsconfig 'files' based on criteria in 'filesGlob' property
 */
gulp.task("tsconfig-glob", function () {
	return tsConfig({
		configPath: "./src/",
		cwd: process.cwd(),
		indent: 2
	});
});


/*
 compile typescript'
 */
gulp.task('typescript', ['tsconfig-glob'], function () {
	var tsResult =
		tsProject.src()
			//gulp.src('src/js/*.ts')
			.pipe(sourcemaps.init())
			.pipe(ts(tsProject));
	var js = tsResult.js
		.pipe(rename({dirname: ''}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('dist/js'));
	return js;

	// return tsResult.js
	//   .pipe(rename({dirname: ''}))
	//   .pipe(sourcemaps.write('./'))
	//   .pipe(gulp.dest('dist/js'));
});


/*
 copy all html files and assets
 */
gulp.task('copy', function () {  //  TODO pretty this up
	gulp.src('src/**/*.html').pipe(gulp.dest('dist'));
	gulp.src('src/**/*.js').pipe(gulp.dest('dist'));
	gulp.src('src/img/*').pipe(gulp.dest('dist/img'));
	gulp.src('src/manifest.json').pipe(gulp.dest('dist'));
	gulp.src('src/css/*').pipe(gulp.dest('dist/css'));
});


/*
 Watch  TODO: Split this up more?
 */
gulp.task('watch', function () {
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch(['src/**/*.html', 'src/**/*.js', 'src/**/*.css', 'src/*.json', 'src/img/*'], ['copy']);
});


/*
 Default task
 */
gulp.task('default', ['tsconfig-glob', 'typescript', 'copy', 'watch']);
