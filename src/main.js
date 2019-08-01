import App from './App.html';

let pars = (() => {
	let p = {};
	location.search.substr(1).split('&').forEach((it) => {
		let arr = it.split('=');
		p[arr[0]] = arr[1];
	});
	return p;
})();

if (locConfig && locConfig.permID) {
	pars.config = locConfig.permID;
}

console.log('ddddd', locConfig);
let mCont = document.getElementsByClassName('layout-mapPlaceholder')[0];

const app = new App({
	target: mCont || document.body,
	data: {
		urlParams: pars
	}
});

export default app;