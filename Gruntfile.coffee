module.exports = (grunt) ->

  deploy_path = 'B:/bsouthga/projections/'

  #
  # Full build system steps
  #
  full_build = [
    'uglify:js'     # uglify urban js files
    'cssmin'        # uglify urban css files
    'processhtml'   # replace development <script> tags with dist
    'htmlmin'       # minify html
    'copy:deploy'   # copy build to deployment folder
  ]

  js_dependencies = [
    "d3/d3.min.js"
    "d3/queue.v1.min.js"
    "d3/topojson.v1.min.js"
    "jquery/jquery-1.11.1.min.js"
    "bootstrap/js/bootstrap.min.js"
    "select2/select2.min.js"
  ]

  css_dependencies = [
    "./app/lib/bootstrap/css/bootstrap.min.css"
    "./app/lib/select2/select2.css"
    "./app/lib/font-awesome-4.1.0/css/font-awesome.min.css"
  ]

  js_src = [
    "module.js"
    "path.js"
    "progress.js"
    "select.js"
    "dropdown.js"
    "mapper.js"
    "lineChart.js"
    "barChart.js"
    "detail.js"
    "carousel.js"
    "main.js"
  ]

  css_src = [
    "map.css"
    "charts.css"
    "carousel.css"
    "main.css"
    "full-width-pics.css"
    "select2-bootstrap.css"
  ]

  # Register configuration
  grunt.initConfig
    copy :
      deploy :
        files : [
          {
            expand: true
            cwd : "dist/"
            src: ['**']
            dest: deploy_path
          }
        ]
    uglify:
      options:
        mangle: true
        banner : """
/* --- population projections v2 (bsouthga@gmail.com) --- */

"""
      js:
        files:
          './dist/js/app.min.js' : (
            "./app/lib/#{f}" for f in js_dependencies
          ).concat("./app/src/#{f}" for f in js_src)
    watch:
      coffee :
        files: [
          './app/src/*'
        ]
        tasks: ['copy:main']
      html :
        files : ['./app/index.html']
        tasks: ['copy:main']
      css :
        files : [
          "./app/css/*"
        ]
        tasks: ['copy:main']
      options :
        livereload : true
    browserSync:
      bsFiles:
        src : [
          './app/css/main.css'
          './app/index.html'
        ].concat("./app/src/#{f}" for f in js_src)
      options:
        notify: false
        watchTask: true
        server:
            baseDir: "./app/"
    processhtml :
      dist :
        files :
          './app/index_dist.html' : ['./app/index.html']
    htmlmin :
      dist :
        options :
          removeComments: true,
          collapseWhitespace: true
        files :
          './dist/index.html' : './app/index_dist.html'
    cssmin :
      options :
        keepSpecialComments : 0
        banner : """
/* --- population projections v2 (bsouthga@gmail.com) --- */

"""
      dist :
        files :
          './dist/css/app.min.css' : css_dependencies.concat(
            "./app/css/#{f}" for f in css_src
          )

  libs = [
   'grunt-contrib-uglify'
   'grunt-contrib-watch'
   'grunt-contrib-coffee'
   'grunt-contrib-concat'
   'grunt-contrib-copy'
   'grunt-contrib-htmlmin'
   'grunt-contrib-cssmin'
   'grunt-browser-sync'
   'grunt-processhtml'
  ]

  grunt.loadNpmTasks(pkg) for pkg in libs

  grunt.registerTask 'default', [
    'browserSync'
    'watch'
  ]

  grunt.registerTask 'deploy', full_build

