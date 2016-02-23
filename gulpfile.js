var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var notify = require('gulp-notify');
var connect = require('gulp-connect');
var minify = require('gulp-minify-css');

gulp.task('scripts', function() {
  gulp.src('js/*.js')
  	.pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(concat('simplify-search.js'))
    .pipe(gulp.dest('dist/js/'))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    // .pipe(gulp.dest('dist'))
    .pipe(gulp.dest("dist/js/"))
    .pipe(notify({ message: 'Scripts task complete' }));
});

gulp.task('styles', function () {
  gulp.src('css/*.css')
    .pipe(minify()) //{keepBreaks: true}
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist/css/'));
});


gulp.task('watch', ['scripts','styles'], function() {
	gulp.watch('js/*.js', ['scripts']);
	gulp.watch('css/*.css', ['styles']);
});

// Default task
gulp.task('default', ['scripts','styles']);
