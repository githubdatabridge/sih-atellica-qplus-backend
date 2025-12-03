// @ts-nocheck

const Service = require('node-windows').Service;
const EventLogger = require('node-windows').EventLogger;
const dotenv = require('dotenv');

const log = new EventLogger(process.env['TITLE']);
const config = dotenv.config();

// Create a new service object
const svc = new Service({
    name: process.env['TITLE'],
    description: process.env['DESCRIPTION'],
    // eslint-disable-next-line global-require
    script: require('path').join(__dirname, 'index.js'),
    nodeOptions: ['--max-old-space-size=8192'],
    wait: 2,
    grow: 0.5,
});

svc.logOnAs.domain = process.env['SVC_DOMAIN'];
svc.logOnAs.account = process.env['SVC_ACCOUNT'];
svc.logOnAs.password = process.env['SVC_PWD'];

// Listen for the 'install' event, which indicates the
// process is available as a service.
svc.on('install', () => {
    log.info('Service installed, starting');
    svc.start();
});

log.info(
    // eslint-disable-next-line max-len
    `Starting installation of ${process.env['TITLE']} as a windows service`
);

svc.install();
