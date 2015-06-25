## Mapping America's Future

view current [production version here](http://datatools.urban.org/features/bsouthga/projections)

### Building the project

Requirements :
- [nodejs](http://nodejs.org/)

Windows requirements :
*The following requirements are standard to all OSX and Linux systems*
-[make](http://gnuwin32.sourceforge.net/packages/make.htm) (link to windows installer)
-[tar](http://gnuwin32.sourceforge.net/packages/gtar.htm) (link to windows installer)

NOTE : the data is not includeded within this repository, but can be obtained via the "All available data" link on the graphic.

Once the requirements are installed, clone the repository and run...

```
npm install
npm install -g grunt-cli
```

to install the grunt dependencies. Then, run...

```
grunt
```

to start a development server.

To deploy, change the deployment path in `Gruntfile.coffee` and run...

```
grunt deploy
```

To update the data from the stata server, first check the folder paths in `Makefile`, and then run

```
make data
```
