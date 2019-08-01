*Управление конструктором приложений

---

Примеры
------
  * [config=RSO4E](https://originalsin.github.io/svelte.geomixer/public/?config=RSO4E) - пермалинк 1 (по умолчанию)
  * [config=7ZSC4](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4) - пермалинк 2 (по умолчанию)
  * [config=7ZSC4](https://originalsin.github.io/svelte.geomixer/public/?config=196JI&edit=1) - пермалинк 3 (редактирование `edit=1`)

  
 Для работы примера сделайте пермалинк от winnie.kosmosnimki.ru и добавьте его в URL ?config=NALXY
 При вставке приложения на свой сайт требуется получить АПИ ключ как описано [в документации по Геомиксеру](https://geomixer.ru/docs/) и добавить его в URL в качестве параметра `apiKey=ВашАПИКлюч` (например `apiKey=Z2SSNR87N4`)
 
 ### Параметры ключей конструктора

Свойство|По умолчанию|Значения|Описание и примеры
------|:---------:|:-----------|:-----------
theme|`dark`| `dark`, `white` | стилевая схема приложения.<br>[переключение стилевой схемы на `theme=white`](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4&theme=white)
iconSidebar|`true`|`true`, `false`| управление контролом Sidebar.<br>[отключение контрола Sidebar `iconSidebar=false`](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4&iconSidebar=false)
treeView|`true`|`true`, `false`, `opened`| дерево-легенда слоев.<br> [отключение `treeView=false`](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4&iconSidebar=false)
iconLayers|`true`|`true`, `false`| управление контролом iconLayers.<br> [отключение контрола iconLayers `iconLayers=false`](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4&iconLayers=false)
drawing|`true`|`true`, `false`| управление контролом gmxDrawing.<br> [отключение контрола gmxDrawing `drawing=false`](https://originalsin.github.io/svelte.geomixer/public/?config=7ZSC4&drawing=false)
gmxTimeline|`true`|`true`, `false`| управление контролом gmxTimeline.<br> [отключение контрола gmxTimeline `gmxTimeline=false`](https://originalsin.github.io/svelte.geomixer/public/?config=196JI&gmxTimeline=false)

Все вышеперечисленные ключи могут указываться как в свойствах приложения так и в параметрах URL приложения.
В параметрах URL приложения можно указывать дополнительный ключ `edit=1` для отображения параметров приложения.


 ### Пример параметров конфигурации конструктора
 ```javascript
{
  "app": {                       // конфигурации приложения
    "gmxMap": {
      "mapID": "ATTBP",          // id - карты
      "apiKey": "DV62UD5A78"     // АПИ ключ
    },
    "theme": "dark",             // стилевая схема приложения
    "iconSidebar": true,         // добавление сайдбар плагина
    "treeView": true,            // добавление дерева легенды слоев
    "iconLayers": true,          // добавление плагина базовых подложек
    "drawing": false,            // добавление плагина рисования
    "gmxTimeline": true          // добавление плагина таймлана КР
  },
  "state": {                     // состояние карты
    "map": {                     // позиция карты
      "position": {
        "x": 88.59375000000001,
        "y": 59.355596110016315,
        "z": 3
      }
    },
    "calendar": {                 // временной интервал для мультивременных слоев
      "version": "1.1.0",
      "dateBegin": 1542067200000,
      "dateEnd": 1542153600000
    },
    "baseLayersManager": {        // настройки базовых подложек
      "version": "1.0.0",
      "currentID": "sputnik",
      "activeIDs": [
        "satellite",
        "sputnik",
        "here",
        "here_hyb",
        "OSMHybrid",
        "empty",
        "agroRelief",
        "slope",
        "aspect"
      ]
    },
    "layersTree": {              // изменения в дереве слоев
      "expanded": {              // изменения касающиеся папок
        "8Tq6kDaDdiXTPahQ": false,
        "O20voTbJf5ituSW9": false,
        "vmxVgP21s0kA2OHw": false,
        "pUJpeZzMEFhrlpuM": false,
        "63B00BB3B936416A9FC8F51AA56804E1": true,
        "10riUTvti2NTfC5I": false,
        "50D44BE4164F4E3594B5F7C02A60E66D": false,
        "0E2E354D0BAA45498A48367615E2B4FC": false,
        "snBwe5yM3Gr7mJ68": false,
        "sRFAyNt60qdTa8wB": false,
        "LfcC9XEk9D6kZOz3": false,
        "IPCByT94sAUJQTCn": false
      },
      "visible": {              // изменения касающиеся слоев
        "8EE2C7996800458AAF70BABB43321FA4": true
      }
    }
  }
}
```
