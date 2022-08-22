const fs = require('fs');
const url = require('url');
const https = require('https');
const spawn = require('child_process').spawn;
const querystring = require('querystring');
const readline = require('readline');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const notifier = require('node-notifier');
const config = require('./config.js');

// 定时任务规则
const scheduleRule = new schedule.RecurrenceRule();

scheduleRule.second = 0;

const matchReg = /\d+码|\d+碼|\d+枚/;
const host = config.host;
const storePath = './spider.json';

const OPEN_EMAIL = config.spider.email; // 开通服务的邮箱（一般都是自己的邮箱）
const mailTransporter = nodemailer.createTransport({
    host: config.spider.host, // 邮箱服务器主机，如：smtp.163.com
    service: config.spider.service, // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: config.spider.port, // SMTP 端口
    secureConnection: config.spider.secureConnection, // 使用了 SSL
    auth: {
        user: OPEN_EMAIL, // 你的邮箱
        // 这里密码不是qq密码，是你设置的smtp授权码
        pass: config.spider.auth.pass,
    },
});

let store;
let cookie = '';

const readlineInstance = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 创建读取行
const createReadline = (title) => {
    return new Promise((resolve) => {
        readlineInstance.question(title, res => {
            readlineInstance.close();

            resolve(res);
        });
    });
};

// 休眠
const sleep = (timeout) => {
    let timer = null;

    return new Promise((resolve) => {
        timer = setTimeout(() => {
            resolve();

            clearTimeout(timer);

            timer = null;
        }, timeout);
    });
};

// 获取数据
const getStore = () => {
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify({ task: [] }));
    }

    return JSON.parse(fs.readFileSync(storePath));
};

// 保存数据
const saveStore = () => {
    fs.writeFileSync(storePath, JSON.stringify(store));

    return Promise.resolve();
};

// 发送邮件
function sendMail({ from = `1024<${OPEN_EMAIL}>`, to = OPEN_EMAIL, subject = `1024出码: ${new Date()}`, html }) {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from, // sender address
            to, // 可以发送给别个，也可以发送给自己
            subject, // Subject line
            // 发送text或者html格式
            // text: 'Hello 我是张三', // plain text body
            html, // html body
        };

        // send mail with defined transport object
        mailTransporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return reject(error);
            }

            resolve(info);
        });
    });
}

// 获取页面
const fetchPageByUrl = (_url) => {
    const urlParse = url.parse(_url);
    const options = {
        ...urlParse,
        headers: {
            'cookie': 'ismob=1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
        }
    };

    return new Promise((resolve, reject) => {
        https.get(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(data.toString());
            });
        }).on('error', reject);
    });
};

// 获取帖子列表
const fetchThreadList = async () => {
    try {
        const threadPage = await fetchPageByUrl(`${host}/thread0806.php?fid=7`);

        // const threadPage = fs.readFileSync('./thread.html').toString();
        let threadList = [];
        let start = threadPage.indexOf('t_one');

        while (start !== -1) {
            let end = threadPage.indexOf('<div class="line">', start + 1);

            threadList.push(threadPage.substring(start, end));

            start = threadPage.indexOf('t_one', end);
        }

        threadList = threadList.map(thread => {
            //  <a href="htm_mob/2208/7/5228439.html">如此极品小嫩穴，真想一舔到底，好东西得拿出来分享[49P]</a>
            const reg = /<a[^<>]+href="(?<url>[^<>"]+)"[^<>]*>(?<title>[^<>]*)<\/a>/;
            const match = thread.match(reg);

            return match ? {
                ...match.groups,
                source: `<div class="${thread}`
            } : null;
        }).filter(thread => thread && matchReg.test(thread.title));

        return Promise.resolve(threadList);
    } catch (e) {
        return Promise.reject(e);
    }
};

// 开始
const start = async () => {
    try {
        console.log('开始获取列表', new Date().toLocaleString());

        let threadList = await fetchThreadList();

        threadList = threadList.filter(thread => !store.task.find(t => t.url === thread.url)).map(thread => ({ ...thread, status: 0 }));

        store.task = store.task.concat(threadList);

        const newSendMail = store.task.filter(task => task.status === 0);
        const mailHtml = newSendMail.map(task => {
            return task.source.replace('href="htm_mob', `href="${host}/htm_mob`);
        }).join('');

        console.log('新通知', newSendMail.length);

        if (newSendMail.length) {
            await sendMail({
                html: mailHtml
            });

            notifier.notify({
                title: '1024出码',
                message: `${newSendMail.length}条`,
                sound: true
            });

            newSendMail.forEach(task => {
                task.status = 1;
            });

            console.log('邮件已通知', newSendMail);
        }

        await saveStore();
    } catch (e) {
        throw e;
    }
};

(async () => {
    try {
        if (!fs.existsSync(storePath)) {
            fs.writeFileSync(storePath, JSON.stringify({ task: [] }));
        }

        store = getStore();

        start();

        const job = schedule.scheduleJob(scheduleRule, start);
    } catch (e) {
        console.error('程序异常', e);
    }
})();