// @ts-nocheck

const Service = require('node-windows').Service;
const EventLogger = require('node-windows').EventLogger;
const dotenv = require('dotenv');

const log = new EventLogger(process.env['TITLE']);
const config = dotenv.config();

// Create a new service object
const svc = new Service({
    name: process.env['TITLE'],
    // eslint-disable-next-line global-require
    script: require('path').join(__dirname, 'index.js'),
});

svc.logOnAs.domain = process.env['SVC_DOMAIN'];
svc.logOnAs.account = process.env['SVC_ACCOUNT'];
svc.logOnAs.password = process.env['SVC_PWD'];

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', () => {
    log.info('Service uninstall, starting');
});

// Uninstall the service.
// eslint-disable-next-line max-len
log.info(`Uninstalling ${process.env['TITLE']}`);
svc.uninstall();
