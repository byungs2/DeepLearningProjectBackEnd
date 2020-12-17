const Sequelize = require('sequelize');

class Member extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement : true,
            },
            memberId : {
                type: Sequelize.STRING(45),
                allowNull : false,
            },
            memberPw : {
                type: Sequelize.STRING(45),
                allowNull : false,
            },
            memberName: {
                type: Sequelize.STRING(45),
                allowNull : false,
            },
            memberCount: {
                type : Sequelize.INTEGER,
                allowNull : true,
            },
            memberFace: {
                type : Sequelize.STRING(100),
                allowNull : false,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'Member',
            tableName: 'members',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci'
        });
    }
    static associate(db) {
        db.Member.hasMany(db.State);
        db.Member.hasOne(db.Descriptor,{foreignKey:{unique: true}});
    }
};

module.exports = Member;