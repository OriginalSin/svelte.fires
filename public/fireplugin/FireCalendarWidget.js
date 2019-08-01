var nsGmx = nsGmx || {};

(function($){
    
'use strict';

nsGmx.Translations.addText("rus", { FireCalendarWidget: {
    timeTitlePrefix : 'За ',
    timeTitleLastPrefix : 'За последние ',
    timeTitlePostfix : 'ч (UTC)'
}});
                         
nsGmx.Translations.addText("eng", { FireCalendarWidget: {
    timeTitlePrefix : 'For ',
    timeTitleLastPrefix : 'For last ',
    timeTitlePostfix : 'h (UTC)'
}});


function f(n) {
    return n < 10 ? '0' + n : n;
}

function getStr (hours, minutes) {
    return f(hours) + ":" + f(minutes); /*+ ":" + f(time.seconds)*/
};

var FireCalendarWidget = function(params) {
    params = $.extend({
        dateMax: new Date()
    }, params);
    
    nsGmx.CalendarWidget.call(this, params);
    
    this._dateInterval.on('change', this._updateInfo, this);
    $(this).on('modechange', this._updateInfo.bind(this));
    this._updateInfo();
}

FireCalendarWidget.prototype = Object.create(nsGmx.CalendarWidget.prototype);

FireCalendarWidget.prototype._updateModel = function() {
    var dateBegin = this.getDateBegin(),
        origDateEnd = this.getDateEnd(),
        now = new Date(),
        lastMidnight = nsGmx.CalendarWidget._toMidnight(now),
        dateEnd;
        
    if (lastMidnight <= origDateEnd) {
        //last day
        dateEnd = new Date((now - 1) - (now - 1) % (3600*1000) + 3600*1000); //round to the nearest hour greater then 'now'
        
        if (dateEnd - nsGmx.CalendarWidget._toMidnight(dateBegin) < 12*3600*1000 && this.getMode() === nsGmx.CalendarWidget.SIMPLE_MODE) {
            dateBegin = new Date(dateBegin - nsGmx.CalendarWidget.MS_IN_DAY);
        }
    } else {
        //previous days
        dateEnd = new Date(origDateEnd.valueOf() + nsGmx.CalendarWidget.MS_IN_DAY);
    }
    
    this._dateInterval.set({
        dateBegin: nsGmx.CalendarWidget._toMidnight(dateBegin),
        dateEnd: dateEnd
    });
}

FireCalendarWidget.prototype._updateWidget = function() {
    var dateBegin = +this._dateInterval.get('dateBegin'),
        dateEnd = +this._dateInterval.get('dateEnd');
        
    if (!dateBegin || !dateEnd) {
        return;
    };
    
    var currentDayMode = nsGmx.CalendarWidget._toMidnight(new Date()) < dateEnd;
        
    if (currentDayMode && this.getMode() === nsGmx.CalendarWidget.SIMPLE_MODE && dateEnd - dateBegin < 2 * nsGmx.CalendarWidget.MS_IN_DAY) {
        this._dateBegin.datepicker("setDate", nsGmx.CalendarWidget.toUTC(new Date()));
        this._dateEnd.datepicker("setDate", nsGmx.CalendarWidget.toUTC(new Date()));
    } else {
        nsGmx.CalendarWidget.prototype._updateWidget.call(this);
    }
}

FireCalendarWidget.prototype._updateInfo = function() {
    var isSimpleMode = this.getMode() === nsGmx.CalendarWidget.SIMPLE_MODE;

    this.canvas.find('.CalendarWidget-footer').toggle(isSimpleMode);
    this.canvas.find('.CalendarWidget-dateBeginInfo, .CalendarWidget-dateEndInfo').toggle(!isSimpleMode);

    var dateBegin = this._dateInterval.get('dateBegin'),
        dateEnd = this._dateInterval.get('dateEnd');
        
    if (!dateBegin || !dateEnd) {
        return;
    }
        
    var hours = Math.ceil((dateEnd - dateBegin)/3600000);

    if (isSimpleMode) {
        var hoursStr = hours > 24 ? "24+" + (hours-24) : hours;
        var prefix = hours === 24 ? _gtxt("FireCalendarWidget.timeTitlePrefix") : _gtxt("FireCalendarWidget.timeTitleLastPrefix");

        this.canvas.find('.CalendarWidget-footer').html(prefix + hoursStr + _gtxt("FireCalendarWidget.timeTitlePostfix"));
    } else {
        var dateEndToShow = hours === 24 ? new Date(+dateEnd - 1) : dateEnd; //hack to show 23:59 instead of 00:00
        this.canvas.find('.CalendarWidget-dateBeginInfo').text(getStr(dateBegin.getUTCHours(), dateBegin.getUTCMinutes()) + " (UTC)").attr('title', _gtxt('CalendarWidget.UTC'));
        this.canvas.find('.CalendarWidget-dateEndInfo'  ).text(getStr(dateEndToShow.getUTCHours(), dateEndToShow.getUTCMinutes()) + " (UTC)").attr('title', _gtxt('CalendarWidget.UTC'));
        
    }
}

nsGmx.FireCalendarWidget = FireCalendarWidget;

})(jQuery);