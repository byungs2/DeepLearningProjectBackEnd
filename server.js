//require('@tensorflow/tfjs-node');
const AWS_SMS = require('aws-sdk');
const canvas = require('canvas');
const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
AWS_SMS.config.update({region : 'ap-northeast-1'});

//const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const morgan = require('morgan');
// const url = require('url');
// const http = require('http');
const fs = require('fs');
const mime = require('mime');
const multer = require('multer');
const cors = require('cors');
const getRandomValues = require('get-random-values');
const Member = require('./models/member');
const Admin = require('./models/admin');
const State = require('./models/state');
const Descriptor = require('./models/descriptor');

// router를 사용하지 않고 View도 React로 따로 만드므로 불필요한 부분
// const nunjucks = require('nunjucks');
// const router = express.Router();
// const URL = "www.mask-detector.ml";

const storageSet = multer.diskStorage({
    destination: function (req, file,cb){
        cb(null,'./faceImages');
    },
    filename: function (req, file, cb){
        console.log("=== UPLOAD RUNNING === ")
        cb(null, file.originalname);
    }
});
const storageFace = multer.diskStorage({
    destination: function (req, file,cb){
        cb(null,'./images');
    },
    filename: function (req, file, cb){
        console.log("=== UPLOAD RUNNING === ")
        cb(null, "tempFace.jpg");
    }
});
//const upload = multer({dest : './images'})
const upload = multer({storage: storageSet});
const uploadFace = multer({storage: storageFace});

const app = express();
const URL = "http://localhost:8082";
const adminURL = "http://localhost:3000/admin";

app.use(cors());

//express에는 body-parser 기능 built-in되어있다
// app.use(express.json());
// app.use(express.urlencoded( {extended : false } ));
//app.use(bodyParser.json);

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

// face api model loading 하는 비동기 함수
async function faceLoader(){
    try {
        await faceapi.nets.faceRecognitionNet.loadFromDisk('./weights');
        await faceapi.nets.faceLandmark68Net.loadFromDisk('./weights');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk('./weights');

        console.log("==== face recognition model loading complete ====");
    } catch (error) {
        console.log(error);
    }
}


sequelize.sync({ force: false })
    .then(() => {
        // FaceApi faceRecognitionNet라는 네크워크에 Pretrained weights loading
        faceLoader();

        const masterPassword = new Uint8Array(10);
        getRandomValues(masterPassword);
        let existingMaster = null;
        Admin.findOne({where : {adminId : "master"}}).then(function(res){
            existingMaster = res;
            if(existingMaster !== null){
                console.log("master update");
                Admin.update({
                    adminId : "master",
                    adminPw : masterPassword.toString(),
                    adminPhoneNum : "01020679386"
                },{ where : {adminId : "master"}});
                console.log('Master Admin Pw 수정됨 ');
            }else{
                console.log("master create");
                Admin.create({
                    adminId : "master",
                    adminPw : masterPassword.toString(),
                    adminPhoneNum : "01020679386" 
                });
                console.log('Master Admin 생성됨');
            }
            console.log("==== masterId : master ====");
            console.log("==== masterPw : " + masterPassword.toString() + " ====");
            console.log("==== YOU SHOULD TYPE EVERY COMMA IN MASTER PASSWORD TO GET AUTH ===");
        });
        console.log('데이터베이스 연결됨');
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

                const members = await Member.findOne({where : { memberFace : urlPath}});
                const labeledDesc = [];
                const idx = members.memberFace.indexOf('faceImage');
                const imagePath = members.memberFace.substring(idx);
                const data = await canvas.loadImage('./' + imagePath);
                const singleFaceDesc = await faceapi.detectSingleFace(data).withFaceLandmarks().withFaceDescriptor();
                const desc = new faceapi.LabeledFaceDescriptors(members.memberName, [singleFaceDesc.descriptor]);
                labeledDesc.push(desc);

                const strDesc = JSON.stringify(labeledDesc);
                await Descriptor.create({
                    desc : strDesc
                })

                res.status(201).json(member);
            }else{
                const member = await Member.create({
                    memberName : req.body.memberName,
                    memberCount : req.body.memberCount,
                    memberFace : urlPath,
                });

                const members = await Member.findOne({where : { memberFace : urlPath}});
                const labeledDesc = [];
                const idx = members.memberFace.indexOf('faceImage');
                const imagePath = members.memberFace.substring(idx);
                const data = await canvas.loadImage('./' + imagePath);
                const singleFaceDesc = await faceapi.detectSingleFace(data).withFaceLandmarks().withFaceDescriptor();
                const desc = new faceapi.LabeledFaceDescriptors(members.memberName, [singleFaceDesc.descriptor]);
                labeledDesc.push(desc);

                const strDesc = JSON.stringify(labeledDesc);
                await Descriptor.create({
                    desc : strDesc
                })

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
        await Descriptor.destroy({where : { id : memberId}});
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
        if(member !== null){
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
        }else{
            res.status(406).json("wrong memberId");
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
    if(req.body.data.adminPhoneNum.indexOf('-') > -1){
        res.status(406).json("wrong format of Phone Numbers");
    }else{
        try {
            const adminId = req.body.data.adminId;
            const existingAdmin = await Admin.findOne({where : {adminId : adminId}});
            if(existingAdmin !== null){
                res.status(406).json(existingAdmin);
            }else{
                const admin = await Admin.create({
                    adminId : req.body.data.adminId,
                    adminPw : req.body.data.adminPw,
                    adminPhoneNum : req.body.data.adminPhoneNum,
                });
                res.json(admin);
            }
        } catch (error) {   
            console.log(error);
        }
    }

});

// Update One
app.put('/admin/:adminId', async (req,res) => {
    if(req.body.data.adminPhoneNum.indexOf('-') > -1){
        res.status(406).json("wrong format of Phone Numbers");
    }else{
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
                    adminPhoneNum : req.body.data.adminPhoneNum,
                }, {
                    where : { id : adminId }
                })
                const admin = await Admin.findByPk(adminId);
                res.json(admin);
            }
        } catch (error) {
            console.log(error);
        }
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
app.post('/login', async (req,res) => {
    const adminId = req.body.username;
    try {
        const admin = await Admin.findOne({where : {adminId : adminId}});
        if(!admin){
            res.status(406).json("wrong username");
        }else{
            res.status(201).json(admin);
        }
    } catch (error) {
        console.log(error);
    }
});

// iOS로부터 받아온 image request 처리
app.post('/nomask',uploadFace.single("tempFace"), async (req, res) => {
    const image = await canvas.loadImage('./images/tempFace.jpg');
    try {
        const descFace = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

        const strDescripotors = await Descriptor.findAll();
        const labeledDesc = [];
        for(let i = 0; i < strDescripotors.length; i++){
            const strD = strDescripotors[i];
            const memberName = strD.desc.substring(strD.desc.indexOf('label')+8,strD.desc.indexOf('descriptors')-3);
            const descriptor = Float32Array.from(strD.desc.substring(strD.desc.indexOf('descriptors')+15,strD.desc.length-4).split(','),parseFloat);
            const desc = new faceapi.LabeledFaceDescriptors(memberName, [descriptor]);
            labeledDesc.push(desc);
        }
        const faceMatcher = new faceapi.FaceMatcher(labeledDesc);
        const bestMatch = faceMatcher.findBestMatch(descFace.descriptor);
        const strBestMatch = bestMatch.toString();
        //penalty
        const distance = strBestMatch.substring(strBestMatch.indexOf(' ')+2,strBestMatch.length-1);
        console.log(distance);

        if(parseFloat(distance) >= 0.6){
            console.log(strBestMatch);
            res.json("unknown");
        }else{
            console.log(strBestMatch);
            const name = strBestMatch.substring(0,strBestMatch.indexOf(' '));
            const member = await Member.findOne({where : {memberName : name}});
            await Member.update({
                memberCount : member.memberCount + 1
            }, {where : {memberName : name}});
            res.json(name);
        }

    } catch (error) {
        console.log(error);
    }
});

// iOS로부터 받아온 관리자 request 처리
app.get('/call', async (req,res)=>{
    try {
        //추후 수정이 필요한 부분
        const adminId = 1;
        const admin = await Admin.findByPk(adminId);
        const paramms = {
            Message : 'Warning',
            PhoneNumber : '+82' + admin.adminPhoneNum,
        };
        const publishTextPromise = new AWS_SMS.SNS({apiVersion: '2019-06-22'}).publish(paramms).promise();
        publishTextPromise.then(function(data){
            console.log("MessageID is " + data.MessageId);
            res.json("true");
        }).catch(
            function(err){
                console.log(err,err.stack);
                res.json("false");
            }
        );
    } catch (error) {
        console.log(error);
    }
});

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});