var Docker = require('dockerode');

var docker = new Docker({
  socketPath: '/var/run/docker.sock'
});


module.exports.run = function (context, imageName, done) {
  docker.run(imageName, [], process.stdout, {}, {}, function (err, data, container) {
    console.log('Finished', err, data);
    if (err){
      console.log('Error running tests', err);
      return done(err)
    }
    else{
      if (data && data.StatusCode === 0){
        return done()
      }
      else{
        return done("Error running tests.")
      }
    }
  });
}
