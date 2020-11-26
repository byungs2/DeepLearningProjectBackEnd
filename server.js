const express = require('express');
const path = require('path');
const morgan = require('morgan');
const url = require('url');
const http = require('http');
const fs = require('fs');
const mime = require('mime');
const multer = require('multer');
const cors = require('cors');
const Member = require('./models/member');
const Admin = require('./models/admin');
const State = require('./models/state');

// router를 사용하지 않고 View도 React로 따로 만드므로 불필요한 부분
// const nunjucks = require('nunjucks');
// const router = express.Router();
// const URL = "www.mask-detector.ml";

const storageSet = multer.diskStorage({
    destination: function (req, file,cb){
        cb(null,'./faceImages');
    },
    filename: function (req, file, cb){
        console.log(" === UPLOAD RUNNING === ")
        cb(null, file.originalname);
    }
})
//const upload = multer({dest : './images'})
const upload = multer({storage: storageSet});
const app = express();
const URL = "http://localhost:8082";


app.use(cors());

const { sequelize } = require('./models'); // db.sequelize
const { UV_FS_O_FILEMAP } = require('constants');

//MySQL DB와 연동
app.set('port', process.env.PORT || 8082);

// router를 사용하지 않고 View도 React로 따로 만드므로 불필요한 부분
// app.set('view engine', 'html');
// nunjucks.configure('views', {
//     express: app,
//     watch: true
// });


sequelize.sync({ force: false })
    .then(() => {
        console.log('데이터베이스 연결됨.');
    }).catch((err) => {
        console.error(err);
    });

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// router를 사용하지 않고 View도 React로 따로 만드므로 불필요한 부분 
// app.use((req, res, next) => {
//     const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
//     error.status = 404;
//     next(error);
// });
// app.use((err, req, res, next) => {
//     res.locals.message = err.message;
//     res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
//     res.status(err.status || 500);
//     res.render('error');
// });


// 각 Entity들의 CRUD 기능 구현과 REST url 설정

// 0. Get an Image
app.get('/member/faceImages/:imageName', async (req, res) => {
    try {
        const imageName = req.params.imageName;
        const imagePath = "faceImages/" + imageName;
        const imageMime = mime.getType(imagePath);
        fs.readFile(imagePath, (err,data) => {
            if(err){
                res.writeHead(500,{'Content-Type':'text/html'});
                res.end('500 Internal Server '+error);
            }else{
                res.writeHead(200, {'Content-Type':imageMime});
                res.end(data);
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// 1. member entity

// Read all
app.get('/member', async (req,res) => {
    try {
        const members = await Member.findAll();
        //Header Setting
        res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
        res.setHeader('X-Total-Count',members.length);
        res.json(members);
    } catch (error) {
        console.log(error);
    }
});

// Create one
app.post('/member',upload.single('memberFace'),async (req,res) => {
    if(!req.file){
        res.status(201).json(req.body);
    }else{
        const urlPath = URL + req.url + "/" + req.file.path;
        try {
            if(req.body.memberCount === "undefined"){
                const member = await Member.create({
                    memberName : req.body.memberName,
                    memberCount : 0,
                    memberFace : urlPath,
                });
                res.status(201).json(member);
            }else{
                const member = await Member.create({
                    memberName : req.body.memberName,
                    memberCount : req.body.memberCount,
                    memberFace : urlPath,
                });
                res.status(201).json(member);
            }
        } catch (error) {
            console.log(error);
        }
    }
});

// Update one 
app.put('/member/:memberId',upload.single('updateMemberFace') ,async (req,res) => {
    if(!req.file){
        const memberId = req.params.memberId;
        const member = await Member.findByPk(memberId);
        const result = await Member.update({
            memberName: req.body.memberName,
            memberCount : req.body.memberCount,
            memberFace : member.memberFace,
        }, {
            where: { id: memberId },
        });
        const updatedMember = await Member.findByPk(memberId);
        res.status(201).json(updatedMember);
    }else{
        try {
            const memberId = req.params.memberId;
            const member = await Member.findByPk(memberId);
            const idx = member.memberFace.indexOf('faceImage');
            const imagePath = member.memberFace.substring(idx);
            if(req.file.path !== imagePath){
                fs.unlink(imagePath, (err,data)=>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log("===== delete image complete =====");
                    }
                })
            }
            const urlPath = URL + '/member/' + req.file.path;
            const result = await Member.update({
                memberName: req.body.memberName,
                memberCount : req.body.memberCount,
                memberFace : urlPath,
            }, {
                where: { id: memberId },
            });
            const updatedMember = await Member.findByPk(memberId);
            res.json(updatedMember);
        } catch (err) {
            console.log(error);
        }
    }
});

// Delete one
app.delete('/member/:memberId', async (req, res) => {
    try {
        const memberId = req.params.memberId;
        const member = await Member.findOne({where : { id : memberId}});
        const idx = member.memberFace.indexOf('faceImage');
        const imagePath = member.memberFace.substring(idx);
        fs.unlink(imagePath, (err,data)=>{
            if(err){
                console.log(err);
            }else{
                console.log("===== delete image complete =====");
            }
        })
        const result = await Member.destroy({where : { id : memberId}});
        res.json(result);
    } catch (error) {
        console.log(error);
    }
});

// Get one
app.get('/member/:memberId', async (req, res) => {
    try {
        const memberId = req.params.memberId;
        const member = await Member.findByPk(memberId);
        res.json(member);
    } catch (error) {
        console.log(error);
    }
});


// 2. state entity

// Read all
app.get('/state', async (req,res) => {
    try {
        const states = await State.findAll();
        //Header Setting
        res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
        res.setHeader('X-Total-Count',states.length);
        res.json(states);
    } catch (error) {
        console.log(error);
    }
});

// Create One
app.post('/state', async (req,res) => {
    try {
        const memberId = req.body.data.memberId;
        const member = await Member.findOne({where : { id : memberId}});
        if(req.body.data.stateNote === "undefined"){
            const state = await State.create({
                stateNote : ' ',
                stateTime : Date.now()
            })
            member.addState(state);
            res.json(state);
        }else{
            const state = await State.create({
                stateNote : req.body.data.stateNote,
                stateTime : Date.now(),
            })
            member.addState(state);
            res.json(state);
        }
    } catch (error) {   
        console.log(error);
    }
});

// Update One
app.put('/state/:stateId', async (req,res) => {
    try {
        const stateId = req.params.stateId;
        const result = await State.update({
            stateNote : req.body.data.stateNote,
            stateDate : Date.now(),
        }, {
            where : { id : stateId }
        })
        const state = await State.findByPk(stateId);
        res.json(state);
    } catch (error) {
        console.log(error);
    }
});

// Delete One
app.delete('/state/:stateId', async (req, res) => {
    try {
        const stateId = req.params.stateId;
        const result = await State.destroy({ where : { id : stateId }});
        res.json(result)
    } catch (error) {
        console.log(error);
    }
});

// Get one
app.get('/state/:stateId', async (req, res) => {
    try {
        const stateId = req.params.stateId;
        const state = await State.findByPk(stateId);
        res.json(state);
    } catch (error) {
        console.log(error);
    }
});


// 3. admin entity

// Read all
app.get('/admin', async (req,res) => {
    try {
        const admins = await Admin.findAll();
        //Header Setting
        res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
        res.setHeader('X-Total-Count',admins.length);
        res.json(admins);
    } catch (error) {
        console.log(error);
    }
});

// Create One
app.post('/admin', async (req,res) => {
    try {
        const adminId = req.body.data.adminId;
        const existingAdmin = await Admin.findOne({where : {adminId : adminId}});
        if(existingAdmin !== null){
            res.status(406).json(existingAdmin);
        }else{
            const admin = await Admin.create({
                adminId : req.body.data.adminId,
                adminPw : req.body.data.adminPw
            });
            res.json(admin);
        }
    } catch (error) {   
        console.log(error);
    }
});

// Update One
app.put('/admin/:adminId', async (req,res) => {
    try {
        const adminId = req.params.adminId;
        const existingPw = req.body.data.existingPw;
        const existingAdmin = await Admin.findByPk(adminId);
        if(existingAdmin.adminPw !== existingPw){
            res.status(406).json(existingAdmin);
        }else{
            const result = await Admin.update({
                adminId : req.body.data.adminId,
                adminPw : req.body.data.adminPw,
            }, {
                where : { id : adminId }
            })
            const admin = await Admin.findByPk(adminId);
            res.json(admin);
        }
    } catch (error) {
        console.log(error);
    }
});

// Delete One
app.delete('/admin/:adminId', async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const result = await Admin.destroy({ where : { id : adminId }});
        res.json(result)
    } catch (error) {
        console.log(error);
    }
});

// Get one
app.get('/admin/:adminId', async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const admin = await Admin.findByPk(adminId);
        res.json(admin);
    } catch (error) {
        console.log(error);
    }
});


// Log in function
app.get('/login/:adminId', async (req,res) => {
    const adminId = req.params.adminId;
    try {
        const admin = await Admin.findOne({where : {adminId : adminId}});
        if(!admin){
            res.status(406);
        }else{
            res.json(admin);
        }
    } catch (error) {
        console.log(error);
    }
});

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});