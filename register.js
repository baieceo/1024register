const fs = require('fs');
const url = require('url');
const https = require('https');
const spawn = require('child_process').spawn;
const querystring = require('querystring');
const readline = require('readline');
const nodemailer = require('nodemailer');
const config = require('./config.js');

const host = config.host;
const captchaPath = './codeimg.png';
const storePath = './register.json';
const templatePath = './template.txt';
const lastChar = 'f';

const registerData = {
    regname: config.register.name, // 注册账号
    regpwd: config.register.pwd, // 密码
    regemail: config.register.email, // 邮箱
    invcode: '',
};

let store;
let cookie = '';
let template = '';
let templateIndex = -1;

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

// 发送邮件
function sendMail({ from = `1024<${OPEN_EMAIL}>`, to = OPEN_EMAIL, subject = `1024注册成功: ${new Date()}`, html }) {
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

const readlineInstance = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

// 获取验证码
const fetchCaptcha = () => {
    const _url = `${host}/require/codeimg.php`;

    const options = {
        ...url.parse(_url),
        method: 'GET'
    };

    return new Promise((resolve, reject) => {
        https.get(_url, res => {
            if (res.statusCode === 403) {
                return reject(new Error('IP被封，请尝试重启路由获取新IP，或更换VPN代理'));
            }

            const [resCookie] = res.headers['set-cookie'];

            cookie = /\w+=\w+/.exec(resCookie)[0];

            const ws = fs.createWriteStream(captchaPath);

            res.pipe(ws);

            ws.on('finish', () => {
                ws.close();

                resolve();
            });

            ws.on('error', reject);
        }).on('error', reject);
    });
};

// 识别验证码
const indentficationCaptcha = () => {
    return new Promise((resolve, reject) => {
        const py = spawn('python', ['code.py', captchaPath]);

        py.stdout.on('data', function(res) {
            const data = res.toString().trim();

            resolve(data);
        });
    });
};

// 获取验证码及识别
const fetchValidate = () => {
    return new Promise(async (resolve, reject) => {
        try {
            await fetchCaptcha();

            const code = await indentficationCaptcha();

            resolve(code);
        } catch (e) {
            reject(e);
        }
    });
};

// 验证邀请码/注册
const doRegister = (params) => {
    const _url = `${host}/register.php?`;

    return new Promise((resolve, reject) => {
        const payload = querystring.stringify(params);

        const options = {
            ...url.parse(_url),
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'cookie': cookie
            }
        };

        const req = https.request(options, res => {
            res.on('data', buffer => {
                resolve(buffer.toString());
            });

            res.on('error', reject);
        });

        console.log('发送请求体', payload);

        req.write(payload);

        req.end();
    });
};

//模拟计数器
//占位符模拟依次递增,直到满足条件退出
const increment = (code, target, jw, last, res) => {
    if (res === null) {
        res = [];
    }

    if (last === null) {
        last = [];

        for (let tmp of jw) {
            if (tmp === '{c}') {
                last.push('a');
            } else {
                last.push('0');
            }
        }
    }

    let tmp2 = code;
    let reg;

    for (let i = 0; i < jw.length; i++) {
        if (jw[i] === '{c}') {
            reg = /\{c\}/;
        }

        if (jw[i] === '{a}') {
            reg = /\{a\}/;
        }
        if (jw[i] === '{i}') {
            reg = /\{i\}/;
        }

        tmp2 = tmp2.replace(reg, last[i]);
    }

    res.push(tmp2);

    if (target === tmp2) {
        return res;
    }

    if (last[0] < 10) {
        last[0] = Number(last[0]) + 1;
    } else {
        last[0] = String.fromCharCode(last[0].charCodeAt(0) + 1);
    }

    for (let i = 0; i < jw.length; i++) {
        let tmp = jw[i];

        if (tmp === '{c}') {
            if (last[i].charCodeAt(0) > lastChar.charCodeAt(0)) {
                last[i] = 'a';

                if (i !== jw.length - 1) {
                    last[i + 1] = String.fromCharCode(last[i + 1].charCodeAt(0) + 1);
                }
            }
        }

        if (tmp === '{a}') {
            if (last[i] > 9 && last[i].toString().charCodeAt(0) < 'a'.charCodeAt(0)) {
                last[i] = 'a';
            } else if (last[i].toString().charCodeAt(0) > lastChar.charCodeAt(0)) {
                last[i] = 0;

                if (i !== jw.length - 1) {
                    if (last[i + 1] < 10) {
                        last[i + 1] = Number(last[i + 1]) + 1;
                    } else {
                        last[i + 1] = String.fromCharCode(last[i + 1].charCodeAt(0) + 1);
                    }
                }
            }
        }

        if (tmp === '{i}') {
            if (last[i] > 9) {
                last[i] = 0;

                if (i !== jw.length - 1) {
                    if (last[i + 1] < 10) {
                        last[i + 1] = Number(last[i + 1]) + 1;
                    } else {
                        last[i + 1] = String.fromCharCode(last[i + 1].charCodeAt(0) + 1);
                    }
                }
            }
        }
    }

    return increment(code, target, jw, last, res);
};

// 自增时初始化环境
const initIncrement = (t) => {
    let target = t;
    const list = [];
    const reg = /\{i\}|\{c\}|\{a\}/g;
    const mc = t.match(reg) || [];

    for (let match of mc) {
        list.push(match);
    }

    if (list.length > 3) {
        console.log('使用的匹配符不能超出3个,正常情况超出三个尝试时间将会大于5小时');

        return null;
    }

    for (let tmp of list) {
        if (tmp === '{c}') {
            target = target.replace('{c}', lastChar);
        }

        if (tmp === '{a}') {
            target = target.replace('{a}', lastChar);
        }

        if (tmp === '{i}') {
            target = target.replace('{i}', '9');
        }
    }

    return increment(t, target, list, null, null);
};

// 注册账号
const regisetrAccount = async () => {
    try {
        const validate = await fetchValidate();

        const res = await doRegister({
            regname: registerData.regname,
            regpwd: registerData.regpwd,
            regpwdrepeat: registerData.regpwd,
            regemail: registerData.regemail,
            invcode: registerData.invcode,
            validate,
            forward: '',
            step: 2
        });

        if (res.indexOf('驗證碼不正確') !== -1) {
            console.log('驗證碼不正確');

            return regisetrAccount();
        }

        console.log('注册账号成功', registerData);

        const mailHtml = `
          <h1>恭喜1024注册成功</h1>
          <p>账号：${registerData.regname}</p>
          <p>密码：${registerData.regpwd}</p>
          <p>邮箱：${registerData.regemail}</p>
          <p>邀请码：${registerData.invcode}</p>
          <p>请尽快登录1024，并修改密码</p>
        `;

        await sendMail({
          html: mailHtml
      });

        process.exit();
    } catch (e) {
        console.error('注册账号异常', e);
    }
};

// 获取验证码
const go = async () => {
    try {
        console.log('模板进度数', `${templateIndex + 1}/${store.templateList.length}`);

        if (store.index >= store.total) {
            console.log('任务已结束', store.template);

            fs.writeFileSync(storePath, JSON.stringify(store));

            templateIndex = store.templateList.findIndex(t => t.template === template);

            store.templateList[templateIndex].status = 1;

            const nextTemplateIndex = store.templateList.findIndex(t => t.status === 0);

            if (nextTemplateIndex !== -1) {
                template = store.templateList[nextTemplateIndex].template;
                templateIndex = nextTemplateIndex;

                store.task = initIncrement(template).map(code => ({ code, status: -1 }));
                store.index = 0;
                store.template = template;
                store.current = store.task[store.index];
                store.total = store.task.length;

                console.log('\r\n匹配下一模板', template);
                console.log(`进度：${templateIndex + 1}/${store.templateList.length}`);
            } else {
                console.log('全部任务结束');

                process.exit();
            }
        }

        console.log('任务进度数', `${store.index + 1}/${store.total}`);
        console.log('任务百分比', (store.index / store.total * 100).toFixed(2) + '%');

        // console.log('请求验证码');

        const validate = await fetchValidate();

        console.log('验证码识别', validate);

        const reginvcode = store.task[store.index].code;

        console.log('邀请码模板', template);
        console.log('验证邀请码', reginvcode);

        const validRes = await doRegister({
            reginvcode,
            validate,
            action: 'reginvcodeck'
        });

        // 驗證碼不正確，請重新填寫 <script language="JavaScript1.2">parent.retmsg_invcode('2');</script>
        // 邀請碼不存在或已被使用，您無法注冊！ <script language="JavaScript1.2">parent.retmsg_invcode('1');</script>

        const validNum = /invcode\('(\d+)'\)/.exec(validRes)[1];
        const validMap = {
            0: '恭喜您，您可以使用這個邀請碼註冊！',
            1: '邀請碼不存在或已被使用，您無法注冊！',
            2: '驗證碼不正確，請重新填寫'
        };
        const validMsg = validMap[validNum];

        console.log('邀请码结果', validRes);
        console.log('邀请码消息', validMsg);
        console.log('\r\n');

        store.task[store.index].status = Number(validNum);

        await sleep(config.register.interval);

        if (validNum === '0' || !validMsg) {
            console.log('------------------------------------ 验证成功 ------------------------------------', reginvcode);

            registerData.invcode = reginvcode;

            regisetrAccount();
        }

        if (validNum === '1') {
            store.index++;
            store.current = store.task[store.index];

            fs.writeFileSync(storePath, JSON.stringify(store));

            go();
        }

        if (validNum === '2') {
            store.current = store.task[store.index];

            fs.writeFileSync(storePath, JSON.stringify(store));

            go();
        }
    } catch (e) {
        throw e;
    }
};

// 创建问题
const createQuestion = (title) => {
    return new Promise((resolve) => {
        readlineInstance.question(title, (answer) => {
            readlineInstance.close();

            resolve(answer);
        });
    });
};

(async () => {
    try {
        // 检查模板文件
        if (!fs.existsSync(templatePath)) {
            const templateQuestion = await createQuestion('模板文件不存在，请输入模板，多个模板空格隔开：');

            const templateData = templateQuestion.trim().replace(/\s+/, ' ').replace(/\s/g, '\r\n').trim();

            fs.writeFileSync(templatePath, templateData);
        }

        // 读取模板文件
        const templateFileData = fs.readFileSync(templatePath).toString().split('\r\n').filter(i => i);

        if (!fs.existsSync(storePath)) {
            store = {
                templateList: templateFileData.map(t => ({
                    template: t,
                    status: 0
                })),
                task: [],
                index: 0,
                template: '',
                current: ''
            };

            fs.writeFileSync(storePath, JSON.stringify(store));
        }

        store = JSON.parse(fs.readFileSync(storePath));

        template = store.templateList.find(t => t.status === 0).template;

        templateIndex = store.templateList.findIndex(t => t.template === template);

        console.log(`进度：${templateIndex + 1}/${store.templateList.length}`);

        if (store.template !== template) {
            store.task = initIncrement(template).map(code => ({ code, status: -1 }));
            store.index = 0;
            store.template = template;
            store.current = store.task[store.index];
            store.total = store.task.length;

            fs.writeFileSync(storePath, JSON.stringify(store));
        }

        console.log('模板', store.template);
        console.log('任务', store.total);
        console.log('当前', store.current);

        go();
    } catch (e) {
        console.error('程序异常', e);
    }
})();