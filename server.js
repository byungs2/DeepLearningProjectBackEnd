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
        console.log(file.originalname);
        const ext = file.originalname.substring(file.originalname.indexOf('.'));
        const filename = JSON.stringify(Date.now());
        const date = parseInt(filename) + 540 * 60 * 1000;
        
        cb(null, date.toString()+ext);
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
//const { Sequelize } = require('sequelize/types');
const sq = require('sequelize');
const { isNullOrUndefined } = require('util');

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


sequelize.sync({ force: true })
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
        Descriptor.destroy({where : { MemberId : null }});
        console.log("==== junk data destroyed ====");
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
                res.end('500 Internal Server '+err);
            }else{
                res.writeHead(200, {'Content-Type':imageMime});
                res.end(data);
            }
        });
    } catch (error) {
        console.log(error);
    }
});

app.get('/nomask/images/:imageName', async (req, res) => {
    try {
        const imageName = req.params.imageName;
        const imagePath = "images/" + imageName;
        const imageMime = mime.getType(imagePath);
        fs.readFile(imagePath, (err,data) => {
            if(err){
                res.writeHead(500,{'Content-Type':'text/html'});
                res.end('500 Internal Server '+err);
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
        const Op = sq.Op;
        const searchStr = req.query.q;
        if(searchStr !== undefined){
            const field = req.query._sort;
            const members = await Member.findAll({where : { memberId : {[Op.like] : "%"+searchStr+"%"}}});
            if(field === "id"){
                members.sort(function(a,b){
                    if(req.query._order === 'ASC'){
                        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                    }else if(req.query._order === 'DESC'){
                        return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                    }
                });
            }else if(field === "memberCount"){
                members.sort(function(a,b){
                    if(req.query._order === 'ASC'){
                        return a.memberCount < b.memberCount ? -1 : a.memberCount > b.memberCount ? 1 : 0;
                    }else if(req.query._order === 'DESC'){
                        return a.memberCount > b.memberCount ? -1 : a.memberCount < b.memberCount ? 1 : 0;
                    }
                });
            }
            const partOfMembers = members.slice(req.query._start,req.query._end);
            //Header Setting
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',members.length);
            res.json(partOfMembers);
        }else{
            const field = req.query._sort;
            const members = await Member.findAll();
            if(field === "id"){
                members.sort(function(a,b){
                    if(req.query._order === 'ASC'){
                        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                    }else if(req.query._order === 'DESC'){
                        return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                    }
                });
            }else if(field === "memberCount"){
                members.sort(function(a,b){
                    if(req.query._order === 'ASC'){
                        return a.memberCount < b.memberCount ? -1 : a.memberCount > b.memberCount ? 1 : 0;
                    }else if(req.query._order === 'DESC'){
                        return a.memberCount > b.memberCount ? -1 : a.memberCount < b.memberCount ? 1 : 0;
                    }
                });
            }
            const partOfMembers = members.slice(req.query._start,req.query._end);
            //Header Setting
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',members.length);
            res.json(partOfMembers);
        }
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
        const existMember = await Member.findOne({where : { memberId : req.body.memberId }});
        if(existMember !== null){
            res.status(406).json("existMember");
        }else{
            try {
                if(req.body.memberCount === "undefined"){
                    const member = await Member.create({
                        memberId : req.body.memberId,
                        memberPw : req.body.memberPw,
                        memberName : req.body.memberName,
                        memberCount : 0,
                        memberFace : urlPath,
                    });
                    const labeledDesc = [];
                    const idx = member.memberFace.indexOf('faceImage');
                    const imagePath = member.memberFace.substring(idx);
                    const data = await canvas.loadImage('./' + imagePath);
                    const singleFaceDesc = await faceapi.detectSingleFace(data).withFaceLandmarks().withFaceDescriptor();
                    const desc = new faceapi.LabeledFaceDescriptors(member.memberName, [singleFaceDesc.descriptor]);
                    labeledDesc.push(desc);
    
                    const strDesc = JSON.stringify(labeledDesc);
                    const descriptor = await Descriptor.create({
                        desc : strDesc,
                    });
                    member.setDescriptor(descriptor);
                    res.status(201).json(member);
                }else{
                    const member = await Member.create({
                        memberId : req.body.memberId,
                        memberPw : req.body.memberPw,
                        memberName : req.body.memberName,
                        memberCount : req.body.memberCount,
                        memberFace : urlPath,
                    });
                    const labeledDesc = [];
                    const idx = member.memberFace.indexOf('faceImage');
                    const imagePath = member.memberFace.substring(idx);
                    const data = await canvas.loadImage('./' + imagePath);
                    const singleFaceDesc = await faceapi.detectSingleFace(data).withFaceLandmarks().withFaceDescriptor();
                    const desc = new faceapi.LabeledFaceDescriptors(member.memberName, [singleFaceDesc.descriptor]);
                    labeledDesc.push(desc);
    
                    const strDesc = JSON.stringify(labeledDesc);
                    const descriptor = await Descriptor.create({
                        desc : strDesc,
                    });
                    member.setDescriptor(descriptor);
                    res.status(201).json(member);
                }
            } catch (error) {
                console.log(error);
                const member = await Member.findOne({where : { memberId : req.body.memberId}});
                const idx = member.memberFace.indexOf('faceImage');
                const imagePath = member.memberFace.substring(idx);
                fs.unlink(imagePath, (err,data)=>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log("===== delete image complete =====");
                    }
                })
                Descriptor.destroy({where : { MemberId : member.id}});
                member.destroy();
                
                console.log("===== Can not find any face from picture or Can not create member object or Can not load image from node server =====");
                res.status(406).json({"result" : "create failed"});
            }
        }
    }
});

// Update one 
app.put('/member/:memberId',upload.single('updateMemberFace') ,async (req,res) => {
    const memberId = req.params.memberId;
    if(memberId === "wrong"){
        res.status(406).json({"result" : "update failed"});
    }else{
        const exMember = await Member.findByPk(memberId);
        const exDescriptor = await Descriptor.findOne({where : { MemberId : memberId}});
    
        if(!req.file){
            const member = await Member.findByPk(memberId);
            const result = await Member.update({
                memberId : req.body.memberId,
                memberPw : req.body.memberPw,
                memberName: req.body.memberName,
                memberCount : req.body.memberCount,
                memberFace : member.memberFace,
            }, {
                where: { id: memberId },
            });
            const descriptor = await Descriptor.findOne({where : { MemberId : memberId}});
            const desc = descriptor.desc.replace(member.memberName, req.body.memberName);
            await Descriptor.update({
                desc : desc
            },{where : { MemberId : memberId}});
            const updatedMember = await Member.findByPk(memberId);
            res.status(201).json(updatedMember);
        }else{
            try {
                const member = await Member.findByPk(memberId);
                const idx = member.memberFace.indexOf('faceImage');
                const imagePath = member.memberFace.substring(idx);
                const urlPath = URL + '/member/' + req.file.path;
                const result = await Member.update({
                    memberId : req.body.memberId,
                    memberPw : req.body.memberPw,
                    memberName: req.body.memberName,
                    memberCount : req.body.memberCount,
                    memberFace : urlPath,
                }, {
                    where: { id: memberId },
                });
                const updatedMember = await Member.findByPk(memberId);
                const labeledDesc = [];
                const data = await canvas.loadImage('./' + req.file.path);
                const singleFaceDesc = await faceapi.detectSingleFace(data).withFaceLandmarks().withFaceDescriptor();
                const desc = new faceapi.LabeledFaceDescriptors(updatedMember.memberName, [singleFaceDesc.descriptor]);
                labeledDesc.push(desc);
                const strDesc = JSON.stringify(labeledDesc);
                await Descriptor.update({
                    desc : strDesc
                },{where : { MemberId : memberId}});
                if(req.file.path !== imagePath){
                    fs.unlink(imagePath, (err,data)=>{
                        if(err){
                            console.log(err);
                        }else{
                            console.log("===== delete image complete =====");
                        }
                    })
                }
                res.json(updatedMember);
            } catch (err) {
                console.log(err);
                const member = await Member.findByPk(memberId)
                const idx = member.memberFace.indexOf('faceImage');
                const imagePath = member.memberFace.substring(idx);
                fs.unlink(imagePath, (err,data)=>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log("===== delete image complete =====");
                    }
                })
                await Member.update({
                    memberId : exMember.memberId,
                    memberPw : exMember.memberPw,
                    memberName: exMember.memberName,
                    memberCount : exMember.memberCount,
                    memberFace : exMember.memberFace,
                }, {where : {id : memberId}});
    
                await Descriptor.update({
                    desc : exDescriptor.desc,
                }, {where : { MemberId : memberId }});
    
                console.log("===== Can not find any face from picture or Can not create member object or Can not load image from node server =====");
                res.status(406).json({"id" : "wrong"});
            }
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
        const states = await State.findAll({where : { MemberId : memberId }});
        for(let i = 0; i < states.length; i++){
            const state = states[i];
            if(state.stateFace !== null){
                const stateIdx = state.stateFace.indexOf('images');
                const stateImagePath = state.stateFace.substring(stateIdx);
                fs.unlink(stateImagePath, (err,data)=>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log("===== delete image complete =====");
                    }
                })
            }
        }
        fs.unlink(imagePath, (err,data)=>{
            if(err){
                console.log(err);
            }else{
                console.log("===== delete image complete =====");
            }
        })
        await Descriptor.destroy({where : { MemberId : memberId}});
        await State.destroy({where : {MemberId : memberId}});
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
        const Op = sq.Op;
        const searchStr = req.query.q;
        if(searchStr !== undefined){
            const states = await State.findAll({where : { MemberId : {[Op.like] : "%"+searchStr+"%"}}});
            // const members = await Member.findOne({where : {memberId :searchStr}});
            // const states = members.getStates();
            const partOfStates = states.slice(req.query._start,req.query._end);
            partOfStates.sort(function(a,b){
                if(req.query._order === 'ASC'){
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                }else if(req.query._order === 'DESC'){
                    return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                }
            });
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',states.length);
            res.json(partOfStates);
        }else{
            const states = await State.findAll();
            const partOfStates = states.slice(req.query._start,req.query._end);
            partOfStates.sort(function(a,b){
                if(req.query._order === 'ASC'){
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                }else if(req.query._order === 'DESC'){
                    return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                }
            });
            //Header Setting
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',states.length);
            res.json(partOfStates);
        }
    } catch (error) {
        console.log(error);
    }
});

// Create One
app.post('/state', async (req,res) => {
    try {
        const strDate = JSON.stringify(Date.now());
        const date = new Date(parseInt(strDate) + 540 * 60 * 1000);
        const memberId = req.body.data.memberId;
        const member = await Member.findOne({where : { id : memberId}});
        if(member !== null){
            if(req.body.data.stateNote === "undefined"){
                const state = await State.create({
                    stateNote : ' ',
                    stateTime : date
                })
                member.addState(state);
                res.json(state);
            }else{
                const state = await State.create({
                    stateNote : req.body.data.stateNote,
                    stateTime : date,
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
        const state = await State.findOne({where : { id : stateId}});
        if(state.stateFace !== null){
            const idx = state.stateFace.indexOf('images');
            const imagePath = state.stateFace.substring(idx);
            fs.unlink(imagePath, (err,data)=>{
                if(err){
                    console.log(err);
                }else{
                    console.log("===== delete image complete =====");
                }
            });
            const result = await State.destroy({ where : { id : stateId }});
            res.json(result)
        }else{
            const result = await State.destroy({ where : { id : stateId }});
            res.json(result)
        }
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
        const Op = sq.Op;
        const searchStr = req.query.q;
        if(searchStr !== undefined){
            const admins = await Admin.findAll({where : { adminId : {[Op.like] : "%"+searchStr+"%"}}});
            const partOfAdmins = admins.slice(req.query._start,req.query._end);
            partOfAdmins.sort(function(a,b){
                if(req.query._order === 'ASC'){
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                }else if(req.query._order === 'DESC'){
                    return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                }
            });
            //Header Setting
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',admins.length);
            res.json(partOfAdmins);
        }else{
            const admins = await Admin.findAll();
            const partOfAdmins = admins.slice(req.query._start,req.query._end);
            partOfAdmins.sort(function(a,b){
                if(req.query._order === 'ASC'){
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                }else if(req.query._order === 'DESC'){
                    return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
                }
            });
            //Header Setting
            res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
            res.setHeader('X-Total-Count',admins.length);
            res.json(partOfAdmins);
        }
    } catch (error) {
        console.log(error);
    }
});

// Create One
app.post('/admin', async (req,res) => {
    if(!/^\d+$/.test(req.body.data.adminPhoneNum)){
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
    if(!/^\d+$/.test(req.body.data.adminPhoneNum)){
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

// member log in function 
app.post('/memberlogin', async (req,res) => {
    const memberId = req.body.username;
    try {
        const member = await Member.findOne({where : {memberId : memberId}});
        if(!member){
            res.status(406).json("wrong username");
        }else{
            res.status(201).json(member);
        }
    } catch (error) {
        console.log(error);
    }
});

// admin Log in function
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
    const urlPath = URL + req.url + "/" + req.file.path;
    const imagePath = './'+req.file.path;
    const image = await canvas.loadImage(imagePath);
    const strDate = JSON.stringify(Date.now());
    const date = new Date(parseInt(strDate) + 540 * 60 * 1000);
    try {
        const descFace = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
        const strDescripotors = await Descriptor.findAll();
        const labeledDesc = [];
        for(let i = 0; i < strDescripotors.length; i++){
            const strD = strDescripotors[i];
            const memberName = strD.desc.substring(strD.desc.indexOf('label')+8,strD.desc.indexOf('descriptors')-3);
            const descriptor = Float32Array.from(strD.desc.substring(strD.desc.indexOf('descriptors')+15,strD.desc.length-4).split(','),parseFloat);
            const desc = new faceapi.LabeledFaceDescriptors(memberName+"/"+strD.id, [descriptor]);
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
            fs.unlink(imagePath, (err,data)=>{
                if(err){
                    console.log(err);
                }else{
                    console.log("===== delete image complete =====");
                }
            });
            res.json({ "result":"false", "username" : "unknown", "eDistance" : distance });
        }else{
            console.log(strBestMatch);
            const name = strBestMatch.substring(0,strBestMatch.indexOf(' '));
            const id = parseInt(name.substring(name.indexOf("/")+1));
            const member = await Member.findOne({where : {id : id}});
            await Member.update({
                memberCount : member.memberCount + 1
            }, {where : {id : id}});
            const state = await State.create({
                stateNode : ' ',
                stateTime : date,
                stateFace : urlPath
            });
            member.addState(state);
            res.json({"result" : "true", "username" : name, "count" : member.memberCount + 1, "eDistance" : distance });
        }

    } catch (error) {
        console.log(error);
        fs.unlink(imagePath, (err,data)=>{
            if(err){
                console.log(err);
            }else{
                console.log("===== delete image complete =====");
            }
        });
        res.json({"result" : "false", "message" : "Can not find any face from picture"});
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
            res.json(true);
        }).catch(
            function(err){
                console.log(err,err.stack);
                res.json(false);
            }
        );
    } catch (error) {
        console.log(error);
    }
});

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});