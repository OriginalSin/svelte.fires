import App from './App.html';

let pars = (() => {
	let p = {};
	location.search.substr(1).split('&').forEach((it) => {
		let arr = it.split('=');
		p[arr[0]] = arr[1];
	});
	return p;
})();

let locConfig = window.locConfig || {};
if (locConfig.permID) {
	pars.config = locConfig.permID;
}
if (locConfig.apiKey) {
	pars.apiKey = locConfig.apiKey;
}

let mCont = document.getElementsByClassName('layout-mapPlaceholder')[0];

const app = new App({
	target: mCont || document.body,
	data: {
		urlParams: pars
	}
});

export default app;