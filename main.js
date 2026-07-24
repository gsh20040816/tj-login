// ==UserScript==
// @name         同济大学自动登录与验证码获取
// @namespace    http://tampermonkey.net/
// @version      1.4.4
// @description  使用浏览器自动填充密码时，使得同济大学相关页面可以自动登录，不需要点击登录按钮。支持加强认证自动选择邮箱并监听验证码输入。手动输入密码请勿使用该脚本。
// @author       gshcpp
// @match        https://iam.tongji.edu.cn/idp/authcenter/*
// @match        https://mail.tongji.edu.cn/*
// @grant        window.focus
// @license      GPL3
// ==/UserScript==

(function () {
	'use strict';

	// 定义延迟常量
	const CHECK_INTERVAL_MS = 100;
	const LOGIN_CLICK_DELAY_MS = 100;
	const VERIFY_CHECK_INTERVAL_MS = 500;
	const AUTH_VERIFICATION_MAX_CHECKS = 40;

	// 标记变量，用于控制验证码流程
	let isAuthTabOpened = false;
	let isVerifyCodeTabOpening = false;
	let hasSubmittedLogin = false;
	let hasSentVerifyCode = false;
	let isMonitoringVerifyCodeInput = false;
	let authVerificationCheckCount = 0;
	let isLoginScheduled = false;

	// 网站和XPath对应的列表
	const siteXPaths = {
		'iam.tongji.edu.cn': {
			usernameFieldXPath: '//*[@id="j_username"]',
			passwordFieldXPath: '//*[@id="j_password"]',
			loginButtonXPath: '//*[@id="loginButton"]',
			// 加强认证相关XPath
			authVerificationFormXPath: '//*[@id="authen4Form" or @name="authen4Form"]',
			authMethodSelectXPath: '//*[@id="sel_auth_method"]',
			sendVerifyCodeButtonXPath: '//*[@id="smsBtn"]',
			verifyCodeInputXPath: '//*[@id="authcode"]',
			verifyCodeSubmitButtonXPath: '//*[@class="white loginBt" and @type="button" and onclick="validateLoginFieldSMS(\'authen4Form\')"]'
		},
		'mail.tongji.edu.cn': {
			usernameFieldXPath: '//*[@id="uid"]',
			passwordFieldXPath: '//*[@id="password"]',
			loginButtonXPath: '//form[@class="j-login-form u-form"]/div[3]/button'
		}
		// 在此添加更多网站和对应的XPath
	};

	// 获取当前网站的域名
	const currentDomain = window.location.hostname;

	// 选择当前网站的XPath配置
	const currentSiteXPath = siteXPaths[currentDomain];

	function getFirstElementByXPath(xpath) {
		return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	}

	function isElementVisible(element) {
		if (!element || !(element instanceof Element) || element.hidden) {
			return false;
		}

		const style = window.getComputedStyle(element);
		if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
			return false;
		}

		return element.offsetParent !== null || element.getClientRects().length > 0;
	}

	function isElementEnabled(element) {
		return !!element && !element.disabled && element.getAttribute('aria-disabled') !== 'true';
	}

	function isElementActionable(element) {
		return isElementVisible(element) && isElementEnabled(element);
	}

	function isAuthVerificationPage() {
		if (currentDomain !== 'iam.tongji.edu.cn' || !currentSiteXPath) {
			return false;
		}

		const loginButton = getFirstElementByXPath(currentSiteXPath.loginButtonXPath);
		if (isElementVisible(loginButton)) {
			return false;
		}

		const authVerificationForm = getFirstElementByXPath(currentSiteXPath.authVerificationFormXPath);
		const authMethodSelect = getFirstElementByXPath(currentSiteXPath.authMethodSelectXPath);
		const verifyCodeInput = getFirstElementByXPath(currentSiteXPath.verifyCodeInputXPath);
		const verifyCodeSubmitButton = getFirstElementByXPath(currentSiteXPath.verifyCodeSubmitButtonXPath);

		return isElementVisible(authVerificationForm) ||
			(isElementVisible(authMethodSelect) && isElementVisible(verifyCodeInput) && isElementVisible(verifyCodeSubmitButton));
	}

	// 监听验证码输入框
	function monitorVerifyCodeInput() {
		if (isMonitoringVerifyCodeInput) {
			return;
		}

		if (currentDomain === 'iam.tongji.edu.cn') {
			if (!isAuthVerificationPage()) {
				return;
			}

			const verifyCodeInput = getFirstElementByXPath(currentSiteXPath.verifyCodeInputXPath);
			
			if (isElementVisible(verifyCodeInput)) {
				console.log('找到验证码输入框，添加监听');
				isMonitoringVerifyCodeInput = true;
				
				// 验证码自动提交函数
				const submitVerifyCode = function() {
					if (verifyCodeInput.value && verifyCodeInput.value.length === 6 && /^\d{6}$/.test(verifyCodeInput.value)) {
						console.log('验证码已输入6位，准备提交');
						
						// 点击提交按钮
						const verifyCodeSubmitButton = getFirstElementByXPath(currentSiteXPath.verifyCodeSubmitButtonXPath);
						if (isElementActionable(verifyCodeSubmitButton)) {
							console.log('自动点击提交按钮');
							verifyCodeSubmitButton.click();
						} else {
							console.warn('未找到验证码提交按钮');
						}
					}
				};
				
				// 监听输入事件
				verifyCodeInput.addEventListener('input', submitVerifyCode);
				
				// 监听粘贴事件
				verifyCodeInput.addEventListener('paste', function() {
					// 粘贴后内容需要时间生效，延迟检查
					setTimeout(submitVerifyCode, 50);
				});
			} else {
				// 如果未找到输入框，稍后再试
				setTimeout(monitorVerifyCodeInput, VERIFY_CHECK_INTERVAL_MS);
			}
		}
	}

	// 处理加强认证页面
	function handleAuthVerification() {
		if (currentDomain !== 'iam.tongji.edu.cn' || !currentSiteXPath) {
			return;
		}

		if (!isAuthVerificationPage()) {
			if (hasSubmittedLogin && authVerificationCheckCount < AUTH_VERIFICATION_MAX_CHECKS) {
				authVerificationCheckCount++;
				setTimeout(handleAuthVerification, VERIFY_CHECK_INTERVAL_MS);
			}
			return;
		}

		// 检查是否在认证页面
		const authMethodSelect = getFirstElementByXPath(currentSiteXPath.authMethodSelectXPath);
		if (!isElementVisible(authMethodSelect)) {
			setTimeout(handleAuthVerification, VERIFY_CHECK_INTERVAL_MS);
			return;
		}

		// 选择邮箱选项
		let hasEmailAuthMethod = false;
		for (let i = 0; i < authMethodSelect.options.length; i++) {
			if (authMethodSelect.options[i].textContent.includes('邮箱')) {
				hasEmailAuthMethod = true;
				if (authMethodSelect.selectedIndex !== i) {
					authMethodSelect.selectedIndex = i;
					authMethodSelect.dispatchEvent(new Event('change', { bubbles: true }));
				}
				break;
			}
		}

		if (!hasEmailAuthMethod) {
			console.warn('未找到邮箱验证选项');
			return;
		}

		// 点击发送验证码按钮
		const sendVerifyCodeButton = getFirstElementByXPath(currentSiteXPath.sendVerifyCodeButtonXPath);
		if (!hasSentVerifyCode && isElementActionable(sendVerifyCodeButton)) {
			sendVerifyCodeButton.click();
			hasSentVerifyCode = true;

			// 在新标签页中打开邮箱（仅打开一次）
			if (!isAuthTabOpened && !isVerifyCodeTabOpening) {
				isVerifyCodeTabOpening = true;
				setTimeout(() => {
					window.open('https://mail.tongji.edu.cn/', '_blank');
					isAuthTabOpened = true;
					isVerifyCodeTabOpening = false;
				}, 1000);
			}
		} else if (!hasSentVerifyCode && !sendVerifyCodeButton) {
			setTimeout(handleAuthVerification, VERIFY_CHECK_INTERVAL_MS);
		}

		// 开始监听验证码输入框
		setTimeout(monitorVerifyCodeInput, 1000);
	}

	// 检测自动填充的函数
	function checkAutofill() {
		if (!currentSiteXPath) {
			console.warn('No XPath configuration found for this site:', currentDomain);
			return;
		}

		if (currentDomain === 'iam.tongji.edu.cn' && isAuthVerificationPage()) {
			handleAuthVerification();
			return;
		}

		if (hasSubmittedLogin) {
			if (currentDomain === 'iam.tongji.edu.cn') {
				setTimeout(handleAuthVerification, VERIFY_CHECK_INTERVAL_MS);
			}
			return;
		}

		// 获取用户名输入框
		var usernameField = getFirstElementByXPath(currentSiteXPath.usernameFieldXPath);
		// 获取密码输入框
		var passwordField = getFirstElementByXPath(currentSiteXPath.passwordFieldXPath);
		// 获取登录按钮
		var loginButton = getFirstElementByXPath(currentSiteXPath.loginButtonXPath);

		// 如果用户名输入框、密码输入框和登录按钮都存在
		if (isElementVisible(usernameField) && isElementVisible(passwordField) && isElementVisible(loginButton)) {
			// 检查用户名和密码输入框是否被自动填充
			if (usernameField.value !== '' && passwordField.value !== '') {
				if (isLoginScheduled) {
					return;
				}

				isLoginScheduled = true;
				setTimeout(() => {
					if (usernameField.value === '' || passwordField.value === '' || !isElementActionable(loginButton)) {
						isLoginScheduled = false;
						setTimeout(checkAutofill, CHECK_INTERVAL_MS);
						return;
					}

					// 点击登录按钮
					hasSubmittedLogin = true;
					loginButton.click();

					// 如果是统一认证页面，等待可能出现的加强认证
					if (currentDomain === 'iam.tongji.edu.cn') {
						setTimeout(handleAuthVerification, 1000);
					}
				}, LOGIN_CLICK_DELAY_MS);
			} else {
				// 如果没有被自动填充，再次检查
				setTimeout(checkAutofill, CHECK_INTERVAL_MS);
			}
		} else {
			// 如果元素不存在，也再次检查
			setTimeout(checkAutofill, CHECK_INTERVAL_MS);
		}
	}

	// 根据当前域名执行不同的初始化
	if (currentDomain === 'iam.tongji.edu.cn') {
		// 开始检测自动填充
		setTimeout(checkAutofill, CHECK_INTERVAL_MS);
		// 检查是否已经在加强认证页面
		setTimeout(handleAuthVerification, 1000);
	} else if (currentDomain === 'mail.tongji.edu.cn') {
		// 只在邮箱页面执行自动登录
		setTimeout(checkAutofill, CHECK_INTERVAL_MS);
	}
})();
