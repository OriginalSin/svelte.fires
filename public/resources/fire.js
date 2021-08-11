/** Пожарный
 * @module FireConf
 */
(function(){

// "use strict";

var div = document.createElement('div');
div.title = 'English/Русский';
var style = document.createAttribute('style');
style.value = 'color: #FCFCFE!important; border-radius: 7px; margin: 0 7px; background: linear-gradient( 180deg, #F09634 0%, #EA2223 100%); box-sizing: border-box; cursor: pointer; width: 30px; height: 25px; text-align: center; line-height: 25px; user-select: none;';

div.attributes.setNamedItem(style);
document.querySelector('.block_right').append(div);

var transHash = {
	'Карта пожаров': 'Fire map'
};
var checkLang = function() {
	var lang = localStorage.getItem('lang');
	window.language = lang;
	if (lang === 'eng') {
		div.innerHTML = 'РУ';
		var node = document.querySelector('.search-options-period .info');
		node.innerHTML = node.innerHTML.replace('За последние', 'Last').replace('За', 'Last').replace('ч', 'h');
	} else {
		div.innerHTML = 'EN';
	}
	document.querySelector('.logo_right').innerHTML = lang === 'eng' ? transHash['Карта пожаров'] : 'Карта пожаров';
	document.querySelector('.block_right_1').style.display = lang === 'eng' ? 'none' : 'flex';
	document.querySelector('.block_right_6').style.display = lang === 'eng' ? 'none' : 'flex';
	document.querySelector('.help-title').innerHTML = lang === 'eng' ? 'Fire Map Service is intended only for personal non-commercial use.<br>All rights reserved' : 'Сервис "Карта пожаров" предназначен только для личного некоммерческого использования. Все права защищены';
	
	
	var node = document.querySelector('.block_right_5');
	if (lang === 'eng') {
		node.title = 'About SCANEX';
		node.href = 'https://www.scanex.ru/en/?setlang=en';
	} else {
		node.title = 'Новости СКАНЭКС';
		node.href = 'https://www.scanex.ru/news/';
	}
	if (L.gmx.setLanguage) {
		L.gmx.setLanguage(lang);
	}
	document.getElementsByTagName('meta').description.setAttribute('content', 'Global fire map based on remote sensing and location based technologies. Fire alerting services. Data by NASA and SCANEX');
	document.title = 'SCANEX Fire Map - wildfire satellite operative monitoring';
}

div.onclick = function(e) {
	var t = e.target;
	var href = '/';
	var lang = 'eng';
	if (t.innerHTML === 'EN'){
		t.innerHTML='РУ';
		t.title='Русский/English';
		lang = 'eng';
		href = '/?lang=eng';
	} else {
		t.innerHTML='EN';
		t.title='English/Русский';
		lang = 'rus';
		href = '/';
	}
	window.language = lang;
	localStorage.setItem('lang', lang);
	if (L.leafletMap) {
		href = L.leafletMap._getHref();
	}
	location.href = href;
	//checkLang();
}
if (location.search.indexOf('lang=eng') !== -1) {
	var lang = 'eng';
	window.language = lang;
	localStorage.setItem('lang', lang);
}
checkLang();

L.Map.addInitHook(function() {
    var map = this;
	/*
	map.on('gmxcontroladd', function(ev) {
		if ('copyright' === ev.id) {
		console.log('gmxcontroladd', ev.control);
			ev.control.options.scanexCopyright = window.language === 'eng' ? null : '<a target="_blank" href="./terms.html">&copy; ООО ИТЦ "СКАНЭКС"</a>';
		} else if ('logo' === ev.id) {
			ev.control._container.innerHTML = window.language === 'eng' ? '<a target="_blank" href="https://www.scanex.ru/en/?setlang=en"></a>' : '<a target="_blank" href="https://www.scanex.ru/"></a>';

			ev.control._container.setAttribute('href', window.language === 'eng' ? 'https://www.scanex.ru/en/?setlang=en' : 'https://www.scanex.ru/');
			// ev.control.options.scanexCopyright = window.language === 'eng' ? null : '<a target="_blank" href="./terms.html">&copy; ООО ИТЦ "СКАНЭКС"</a>';
		//	https://www.scanex.ru/en/?setlang=en
		}
	});
	*/
	map.on('controladd', function(target) {
		let id = target.options.id;
		// console.log('target', id, target);
		if ('copyright' === id) {
			target.options.scanexCopyright = window.language === 'eng' ? null : '<a target="_blank" href="./terms.html">&copy; ООО ИТЦ "СКАНЭКС"</a>';
		} else if ('logo' === id) {
			target._container.setAttribute('href', window.language === 'eng' ? 'https://www.scanex.ru/en/?setlang=en' : 'https://www.scanex.ru/');
		}
	});
});

// menu
// var iconMenu = document.getElementsByClassName('icon-menu')[0],
	// ul = iconMenu.getElementsByClassName('dropdownMenuWidget-itemDropdown')[0];


// L.DomEvent
	// .on(iconMenu, 'mouseover', function() {
		// ul.classList.remove('hidden');
	// })
	// .on(iconMenu, 'mouseout', function() {
		// ul.classList.add('hidden');
	// });

})();
