const Docker = require('dockerode')
const tar = require('tar-fs');

module.exports.run = function (context, done) {
  var docker = new Docker({
    socketPath: '/var/run/docker.sock'
  });
  var tarStream = tar.pack(process.cwd());

  var name = `testing-${context.module.name}-${context.senecaVersion}-${context.nodeVersion}`

  console.log(`Start building: ${name}`)

  docker.buildImage(tarStream, {
    t: name
  }, function (err, output) {
    if (err){
      console.log(`Error building Docker container: ${error}`)
      process.exit(1)
    }
    output.pipe(process.stdout);

    docker.modem.followProgress(output, onFinished, onProgress);

    function onFinished (err, output) {
      console.log('Finished: ', err)
      done(err, {name: name})
    }

    function onProgress (event) {
    }
  });
}