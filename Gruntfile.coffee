module.exports = (grunt) ->

  windows_deploy_paths = [
    'B:/bsouthga/projections/'
    'B:/mapping-americas-futures/'
  ]

  osx_deploy_paths = [
    '/Volumes/Features/bsouthga/projections/'
    '/Volumes/Features/mapping-americas-futures/'
  ]

  if /^win/.test(process.platform)
    deploy_paths = windows_deploy_paths
  else
    deploy_paths = osx_deploy_paths



  #
  # Full build system steps
  #
  full_build = [
    'uglify:js'        # uglify urban js files
    'cssmin'           # uglify urban css files
    'concat'           # build index html
    'processhtml'      # replace development <script> tags with dist
    'htmlmin'          # minify html
    'copy:resources'   # copy build to deployment folder
    'copy:deploy'      # copy build to deployment folder
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
    "projections"
    "getTextBBox"
    "dataParser"
    "path"
    "progress"
    "select"
    "dropdown"
    "legend"
    "mapper"
    "lineChart"
    "barChart"
    "detail"
    "carousel"
    "main"
  ].map (f) -> "#{f}.js"

  css_src = [
    "map"
    "charts"
    "carousel"
    "detail"
    "nav"
    "controls"
    "main"
    "full-width-pics"
    "select2-bootstrap"
  ].map (f) -> "#{f}.css"

  layout = [
    "header"
    "dropdown"
    "carousel-start"
    "feature"
    "map"
    "carousel-end"
    "footer"
  ].map (f) -> "./app/layout/#{f}.html"

  # Register configuration
  grunt.initConfig
    copy :
      resources :
        files : (
          {
            expand: true
            cwd : "app/#{dir}/"
            src: ['**']
            dest: "dist/#{dir}/"
          } for dir in ["json", "images"]
        )
      deploy :
        files : (
          {
            expand: true
            cwd : "dist/"
            src: ['**']
            dest: path
          } for path in deploy_paths
        )
    concat :
      options :
        separator : " "
      main :
        src : layout
        dest : "./app/views/index_build.html"
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
      html :
        files : ['./app/layout/*.html']
        tasks : ['concat']
      css :
        files : ["./app/css/*"]
      options :
        livereload : true
    browserSync:
      bsFiles:
        src : [
          './app/css/*'
          './app/views/index_build.html'
        ].concat("./app/src/#{f}" for f in js_src)
      options:
        notify: false
        watchTask: true
        server:
            baseDir: "./app/"
            index : "views/index_build.html"
    processhtml :
      dist :
        files :
          './app/views/index_dist.html' : ['./app/views/index_build.html']
    htmlmin :
      dist :
        options :
          removeComments: true,
          collapseWhitespace: true
        files :
          './dist/index.html' : './app/views/index_dist.html'
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
   'grunt-contrib-concat'
   'grunt-contrib-copy'
   'grunt-contrib-htmlmin'
   'grunt-contrib-cssmin'
   'grunt-browser-sync'
   'grunt-processhtml'
  ]

  grunt.loadNpmTasks(pkg) for pkg in libs

  grunt.registerTask 'default', [
    'concat'
    'browserSync'
    'watch'
  ]

  grunt.registerTask 'deploy', full_build
