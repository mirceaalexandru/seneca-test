"use strict";

const ModuleConfig = require('./config/modules.json')

const DockerBuilder = require('./lib/build')
const DockerRunner = require('./lib/run')
const DockerInit = require('./lib/initDocker')

const Async = require('async')
const Minimist = require('minimist')

const argv = Minimist(process.argv.slice(2))

function runStrategy (options, done) {
  // now run strategies
  if (options.strategy === 'module') {
    testModuleStrategy()
  }
  else{
    testSenecaStrategy()
  }

  function testModuleStrategy(){
    const module = ModuleConfig.modules[options.moduleName]
    console.log('Start testing module: ' + module.npm)

    var contexts = []
    for (var i in ModuleConfig.libraries.seneca.versions) {
      for (var j in module.node) {
        contexts.push({
          module: module,
          options: options,
          config: ModuleConfig,
          senecaVersion: ModuleConfig.libraries.seneca.versions[i],
          nodeVersion: module.node[j]
        })
      }
    }

    Async.mapSeries(contexts, testModuleGithubWithSpecificSeneca, done)
  }

  function testSenecaStrategy(){
    var contexts = []
    for (var i in ModuleConfig.modules) {
      for (var j in ModuleConfig.modules[i].node) {
        contexts.push({
          module: ModuleConfig.modules[i],
          options: options,
          config: ModuleConfig,
          senecaVersion: 'unpublished',
          nodeVersion: ModuleConfig.modules[i].node[j]
        })
      }
    }

    Async.mapSeries(contexts, testModuleGithubWithSpecificSeneca, done)
  }
}

function testModuleGithubWithSpecificSeneca (context, done) {
  var result = {
    configuration: {
      moduleName: context.module.name,
      options: context.options,
      senecaVersion: context.senecaVersion,
      nodeVersion: context.nodeVersion
    }
  }

  Async.series({
    createDocker: function (cb) {
      result.init = {
        status: 'Started'
      }
      DockerInit.run(context, function (err) {
        if (err) {
          result.init.status = 'ERROR'
          result.why = err

          if (context.options.forceStop){
            return cb(err)
          }
        }
        else {
          result.init.status = 'COMPLETED'
        }

        return cb()
      })
    },
    buildImage: function (cb) {
      result.build = {
        status: 'Started'
      }
      DockerBuilder.run(context, function (err, opResult) {
        if (err) {
          result.build.status = 'ERROR'
          result.build.why = err

          if (context.options.forceStop){
            return cb(err)
          }
        }
        else {
          result.build.dockerImage = opResult.name
          result.build.status = 'COMPLETED'
        }

        return cb()
      })
    },
    runImage: function (cb) {
      result.run = {
        status: 'Started'
      }
      DockerRunner.run(context, result.build.dockerImage, function (err) {
        if (err) {
          result.run.status = 'ERROR'
          result.why = err

          if (context.options.forceStop){
            return cb(err)
          }
        }
        else {
          result.run.status = 'COMPLETED'
        }

        return cb()
      })
    }
  }, function (err) {
    done(err, result)
  })
}

function run () {
  console.log(argv)

  if (argv.h){
    printHelp()
    process.exit(1)
  }

  if (!argv.s){
    console.log('You should specify a strategy, aborting operation')
    printHelp()
    process.exit(1)
  }

  if (argv.s === 'module') {
    console.log('Now I will test modules, using testModule strategy')

    if (!argv.m) {
      console.log('You should specify the module to be tested, aborting operation')
      printHelp()
      process.exit(1)
    }

    // test if module is configured
    if (!ModuleConfig.modules[argv.m]){
      console.log('Unknown module. Abort operation.')
      process.exit(1)
    }

    runStrategy({moduleName: argv.m, forceStop: argv.f || false, strategy: argv.s}, function (err, result) {
      printResult(argv.m, err, result)
    })
  }
  else if (argv.s === 'seneca') {
    runStrategy({forceStop: argv.f || false, strategy: argv.s}, function (err, result) {
      printResult(argv.m, err, result)
    })
  }
  else{
    console.log('You should specify a valid strategy, aborting operation.')
    printHelp()
    process.exit(1)
  }
}

function printResult(moduleName, err, result){
  console.log('\n\n')
  console.log(`Testing results are available.`)
  if (err){
    console.log(`Error: ${err}`)
  }

  if (result){
    for (var i in result){
      var res = result[i]

      console.log('\n\n')
      console.log(`ModuleName: ${res.configuration.moduleName}`)
      console.log(`Node version: ${res.configuration.nodeVersion}`)
      console.log(`Seneca version: ${res.configuration.senecaVersion}`)
      console.log(`Docker image: ${res.build ? res.build.dockerImage : undefined}`)
      console.log(`Init result: ${res.init.status}`)
      console.log(`Build result: ${res.build.status}`)
      console.log(`Run result: ${res.run.status}`)

      if (res.run.status === 'ERROR'){
        console.log(`HINT: To see the error please run this from console:\n$ docker run ${res.build.dockerImage}`)
      }
    }
  }
}

function printHelp(){
  console.log('Help')
  console.log('-s\t\tchoose strategy\t\t\t\tAvailable strategies are: module or seneca')
  console.log('-m\t\tchoose module to be tested\t\tTo be used with "-s module" option.')
  console.log('-f\t\tforce stop testing on first error\t\t')
  console.log('-h\t\thelp\t\t\t\t\tPrint this help.')
}

run()

