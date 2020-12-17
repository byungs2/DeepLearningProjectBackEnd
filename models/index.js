const Sequelize = require('sequelize');
const Member = require('./member');
const Admin = require('./admin');
const State = require('./state');
const Descriptor = require('./descriptor');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;

db.Member = Member;
db.Admin = Admin;
db.State = State;
db.Descriptor = Descriptor;

Member.init(sequelize);
State.init(sequelize);
Descriptor.init(sequelize);
Admin.init(sequelize);

Member.associate(db);
Admin.associate(db);
State.associate(db);
Descriptor.associate(db);


module.exports = db;