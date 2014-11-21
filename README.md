## Mapping America's Future

view current [production version here](http://datatools.urban.org/features/bsouthga/projections)

### Building the project

Requirements :
- [nodejs](http://nodejs.org/) (allows use of grunt)
- [grunt](http://gruntjs.com/) (build system and development automation)

Once the requirements are installed, clone the repository and run...

```
npm install
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

