var gulp = require('gulp');
var livereload = require('gulp-livereload');

gulp.task('default', function () {
});

gulp.task('watch', function () {
    livereload.listen();
    gulp.watch(['index.html', "js/*.js", "css/*.css"]).on('change', livereload.changed);
});

gulp.task('dist', function () {
    gulp.src([
        './index.html',
        './js/*.js',
        './img/*.png',
        './css/*.css',
        './data/**',
        './bower_components/jquery/dist/jquery.min.js',
        './bower_components/bootstrap/dist/js/bootstrap.min.js',
        './bower_components/d3/d3.min.js',
        './bower_components/store-js/dist/store.legacy.min.js',
        './bower_components/bootstrap/dist/css/bootstrap.min.css'
    ], {base: "."})
        .pipe(gulp.dest(function (file) {
            return './web/' + file.base;
        }));
});