const Sequelize = require('sequelize');

class State extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement : true,
            },
            stateTime: {
                type: Sequelize.DATE,
                allowNull : false,
            },
            stateMask: {
                type : Sequelize.STRING.BINARY,
                allowNull : false,
            },
            stateNote: {
                type : Sequelize.STRING(100),
                allowNull : true,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'State',
            tableName: 'states',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci'
        });
    }
    static associate(db) {
        db.State.belongsTo(db.Member);
    }
};

module.exports = State;