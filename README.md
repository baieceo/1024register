# 1024Register

1024邀请码工具
两个功能，请按需求使用，如果注册成功， 麻烦再issue中回复一下， 方便大家交流。 

1. spider每分钟爬取一次技术讨论区，爬取包含关键字（x码/x碼/x枚）的帖子，并通过邮箱发送通知。
1. register邀请码暗码破解工具，对数字、字母暗码暴力破解，破解成功后自动注册。
## 环境及依赖安装
请先安装node及python环境

node 16+：node安装成功后执行 npm install 安装node依赖

执行 npm install pm2 -g 安装pm2

python3.x：最好是[3.9.0](https://www.python.org/downloads/release/python-390/)以下版本

ddddocr：python图形识别库，用于识别验证码，执行pip install ddddocr安装

## 如何使用
### 相关命令
爬取邀请码
```
npm run spider
或
node spider
```

破解注册
```
node register
```

### 通用配置

1. 修改config.js文件中host字段，目前 [https://cl.8715x.xyz](https://cl.8715x.xyz) 免翻墙，如被封请更换为 [https://t66y.com](https://cl.8715x.xyz)，并准备好梯子。
### register破解注册

1. 修改config.js文件中register部分注册账号、密码、邮箱，账号请提前在1024网站检查好。
1. 修改template.txt文件，将暗码中数字用`{i}`代替，字母用`{c}`代替，数字/字母用`{a}`代替，每个暗码占一行。

```
如下两个暗码
1*0c525cbd810e*a，隐藏两个字符，第一位是数字/字母，第二位是数字
4a55**18eda208a1，隐藏两个字符，第一位是字母，第二位是数字/字母
```
```
template.txt
1{a}0c525cbd810e{i}a
4a55{c}{a}18eda208a1
```

3. 执行 npm run register，等待注册结果，注册成功后会退出进程，直接用账号登录，如在config.js中正确配置spider邮箱相关参数，会发送注册成功邮件至邮箱。
3. 重新破解注册请重新编辑template.txt模板内容，并删除register.json文件。
3. 因破解一个邀请码最多会尝试256次，所以可能会遇到IP被封的问题，可以尝试重启路由获取新的IP，或更换VPN线路后重新执行npm run register，程序会从失败的地方重新破解。也可尝试修改config.js文件中register.interval破解间隔，单位是毫秒，默认2秒。

![注册成功](https://user-images.githubusercontent.com/19337357/187058590-59b3e729-6d35-4d5a-9338-9fbf9ae879d2.png)

![注册邮件](https://user-images.githubusercontent.com/19337357/187058608-02f2e087-918c-43e9-b679-2371f2894500.png)

![登录成功](https://user-images.githubusercontent.com/19337357/187059575-a26094b9-4554-4b23-93dd-96b9f6243165.png)


### spider邀请码抓取

1. 修改config.js文件中spider部分配置
```
email: 'baiexxx@qq.com', // 开通服务的邮箱
host: 'smtp.qq.com', // 邮箱服务器主机，如：smtp.qq.com
service: 'qq', // 使用了内置传输发送邮件 查看支持列表：[https://nodemailer.com/smtp/well-known/](https://nodemailer.com/smtp/well-known/)
port: 465, // SMTP 端口
secureConnection: true,
auth: {
    pass: 'gasddafcrqufnwnkjjbasdfige' // smtp授权码，请从对应邮件服务提供商配置中查看
}
```

2. 执行npm run spider等待出码。

3. 如手机支持邮箱通知，请在手机进行相关配置，以便在第一时间获取邮件通知，如在外不能第一时间操作，请配合ToDesk或向日葵等远控软件操作

4. 查看抓取日志，运行命令 npm run logs

![出码抓取](https://user-images.githubusercontent.com/19337357/187058618-5bf3911b-d18f-42a1-8e0e-828c4e04f402.png)

![出码邮件](https://user-images.githubusercontent.com/19337357/187058638-e699442a-73f9-479c-a7a2-87281c7a1ff3.png)



## 破解原理
目前邀请码为0-9和a-f字母组成，以2位任意字符（数字/字母）暗码为例，最多会有256种组合，程序先按模板排列组合，生成所有邀请码，并逐一验证。
## 注意事项

1. 确保能正常访问1024
1. 如遇IP被封，请重启路由获取新IP，或更换VPN线路，执行register命令或尝试修改config.js文件中spider.interval破解间隔。
