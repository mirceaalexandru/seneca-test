"use strict";

var FS = require('fs');


module.exports.run = function (context, done) {

  var contentModule =
    `
FROM node:${context.nodeVersion}

RUN apt-get update \
 && apt-get install -y --force-yes --no-install-recommends\
      build-essential \
      git \
      python-all \
      rlwrap \
 && rm -rf /var/lib/apt/lists/*;

WORKDIR /opt/app
RUN git clone ${context.module.github} project

WORKDIR /opt/app/project
RUN npm install

RUN npm install seneca@${context.senecaVersion}

CMD ["npm","test"]
`

  var contentSeneca =
    `
FROM node:${context.nodeVersion}

RUN apt-get update \
 && apt-get install -y --force-yes --no-install-recommends\
      build-essential \
      git \
      python-all \
      rlwrap \
 && rm -rf /var/lib/apt/lists/*;

WORKDIR /opt/app
RUN git clone ${context.module.github} project

WORKDIR /opt/app/project
RUN npm install

WORKDIR /opt/app/project/node_modules

RUN rm -rf seneca
RUN git clone ${context.config.libraries.seneca.github} seneca

WORKDIR /opt/app/project/node_modules/seneca
RUN npm install

WORKDIR /opt/app/project

CMD ["npm","test"]
`

  let content

  if (context.options.strategy === 'module'){
    content = contentModule
  }
  else{
    content = contentSeneca
  }
  FS.writeFile('Dockerfile', content, (err) => {
    console.log('Dockerfile was created')
    done(err)
  })
}
