const Sequelize = require('sequelize');

class Descriptor extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement : true,
            },
            desc: {
                type: Sequelize.TEXT,
                allowNull : false,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Descriptor',
            tableName: 'descriptors',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci'
        });
    }
    static associate(db) {

    }
};

module.exports = Descriptor;