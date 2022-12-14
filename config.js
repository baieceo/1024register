module.exports = {
    host: 'https://cl.8715x.xyz', // 域名，cl.8715x.xyz现免翻墙，如被封请挂梯子访问t66y.com
    // 注册相关
    register: {
        name: 'baiecto', // 注册账号，请提前试好
        pwd: 'baiecto@888', // 密码，请提前试好
        email: 'baiecto@163.com', // 邮箱
        interval: 2000  // 破解间隔
    },
    // 爬虫相关
    spider: {
    	keywords: /\d+码|\d+碼|\d+枚|发码|发碼/,  // 关键词
        email: 'baiecto@163.com', // 开通服务的邮箱
        host: 'smtp.163.com', // 邮箱服务器主机，如：smtp.qq.com
        service: '163', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
        port: 465, // SMTP 端口
        secureConnection: true,
        auth: {
            pass: 'EUBXQCUOKWUVEHGY' // smtp授权码
        }
    }
}