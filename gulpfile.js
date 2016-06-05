var gulp = require('gulp');
var livereload = require('gulp-livereload');

gulp.task('default', function() {
});

gulp.task('watch', function() {
    livereload.listen();
    gulp.watch(['index.html', "js/*.js", "css/*.css"]).on('change', livereload.changed);
});