# 同济大学自动登录与验证码获取

![版本](https://img.shields.io/badge/版本-1.4-blue)
![许可证](https://img.shields.io/badge/许可证-GPL3-green)

## 功能介绍

这是一个Tampermonkey浏览器扩展脚本，主要用于：

- 在同济大学相关页面检测到浏览器自动填充密码后，自动点击登录按钮，无需手动点击
- 支持同济大学统一认证系统的加强认证功能，自动选择邮箱验证方式
- 自动打开邮箱页面以获取验证码
- 监听验证码输入，当输入满6位数字时自动提交

## 支持网站

- 同济大学统一身份认证 `https://iam.tongji.edu.cn`
- 同济大学邮箱 `https://mail.tongji.edu.cn`

## 安装方法

1. 首先安装Tampermonkey浏览器扩展：
   - [Chrome商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox附加组件](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge插件](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. 点击下面链接安装脚本：
   - [安装脚本](https://greasyfork.org/zh-CN/scripts/482379-同济大学自动登录)
   或
   - 手动安装：点击Tampermonkey图标 -> 创建新脚本 -> 复制本仓库中的`main.js`内容 -> 保存

## 使用说明

1. 安装脚本后，访问同济大学相关页面
2. 当浏览器自动填充用户名和密码后，脚本会自动点击登录按钮
3. 如果遇到加强认证，脚本会自动选择邮箱验证方式并点击发送验证码
4. 脚本会自动打开同济邮箱页面，用于获取验证码
5. 在验证码输入框中输入6位数字验证码后，会自动提交

## 注意事项

- 本脚本仅适用于浏览器已保存密码并自动填充的场景
- 手动输入密码时请勿使用此脚本
- 脚本不会存储或传输任何账号信息，所有操作都在本地完成

## 许可证

GPL-3.0
