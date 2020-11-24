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
        console.log(req.body);
        res.status(201).json(req.body);
    }else{
        console.log(" ============ RUN Create  =========== ");
        const urlPath = URL + req.url + "/" + req.file.path;
        try {
            if(req.body.memberCount === "undefined"){
                console.log(req.body.memberCount + "=========== null=====" + typeof(req.body.memberCount));
                const member = await Member.create({
                    memberName : req.body.memberName,
                    memberCount : 0,
                    memberFace : urlPath,
                });
                res.status(201).json(member);
            }else{
                console.log(req.body.memberCount + "======== not null ======"+ typeof(req.body.memberCount));
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
app.patch('url', async (req,res) => {
    
    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

// Delete one
app.delete('url', async (req, res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

// Get one
app.get('/member/:memberId', async (req, res) => {
    try {
        const memberId = req.params.memmberId;
        const member = await Member.findByPk(memberId);
        const idx = member.memberFace.indexOf('faceImages');
        const imagePath = member.memberFace.substring(idx);
        const imageMime = mime.getType(imagePath);
        console.log(imagePath);
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


// 2. state entity
app.get('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

app.post('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

app.patch('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
})

app.delete('url', async (req, res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
})

// 3. admin entity
app.get('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

app.post('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
});

app.patch('url', async (req,res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
})

app.delete('url', async (req, res) => {

    res.setHeader('Access-Control-Expose-Headers','X-Total-Count');
    res.setHeader('X-Total-Count',data.length);
    res.json(data);
})

app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기 중');
});