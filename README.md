## Mapping America's Future

view current [production version here](http://datatools.urban.org/features/bsouthga/projections)

### Building the project

Requirements :
- [nodejs](http://nodejs.org/)

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
