'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'moment'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS
    module.exports = factory(require('jquery'), require('moment'));
  } else {
    // Browser globals
    root.Calendar = factory(jQuery, moment);
  }
} (this, function ($, moment) {
  function Calendar(settings) {
    var self = this;

    this.calIsOpen =      false;
    this.presetIsOpen =   false;
    this.element =        settings.element || $('.daterange');
    this.type =           this.element.hasClass('daterange--single') ? 'single' : 'double';
    this.selected =       null;
    this.earliest_date =  settings.earliest_date ? moment(new Date(settings.earliest_date)).startOf('day')
                          : moment(new Date('January 1, 1900')).startOf('day');
    this.latest_date =    settings.latest_date ? moment(new Date(settings.latest_date)).endOf('day')
                          : moment(new Date('December 31, 2900')).endOf('day');
    this.end_date =       settings.end_date ? new Date(settings.end_date)
                          : (this.type == 'double' ? new Date() : null);
    this.start_date =     settings.start_date ? new Date(settings.start_date)
                          : (this.type == 'double' ? new Date(moment(this.end_date).subtract(1, 'month')) : null);
    this.current_date =   settings.current_date ? new Date(settings.current_date)
                          : (this.type == 'single' ? new Date() : null);
    this.callback =       settings.callback || this.calendarSetDates;
    this.same_day =       settings.same_day || false;

    // These display formats denote the format for the visualisation
    this.display_format = settings.display_format || 'MMMM D, YYYY';
    this.display_year_format = settings.display_year_format || 'YYYY';
    this.display_month_format = settings.display_month_format || 'MMMM';

    // These are used to tranform the final display output for each day (name),
    // month (name) or year (number). After the display_xxx_format is applied,
    // the value is ran through these functions
    this.transform_day =  settings.transform_day || (function( day ) { return day.substring( 0, 1 ); });
    this.transform_month = settings.transform_month || (function( month ) { return month; } );
    this.transform_year = settings.transform_year || (function( month ) { return month; } );

    this.calendarHTML(this.type);

    $('.dr-presets', this.element).click(function() {
      self.presetToggle();
    });

    $('.dr-list-item', this.element).click(function() {
      var range = $('.dr-item-aside', this).html().split('–');

      self.start_date = self.calendarCheckDate( range[0] );
      self.end_date = self.calendarCheckDate( range[1] );
      self.calendarSetDates();
      self.presetToggle();
      self.calendarSaveDates();
    });

    $('.dr-date', this.element).on({
      'click': function() {
        self.calendarOpen(this);
      },

      'keyup': function(event) {
        if (event.keyCode == 9 && !self.calIsOpen && !self.start_date && !self.end_date)
          self.calendarOpen(this);
      },

      'keydown': function(event) {
        switch (event.keyCode) {

          case 9: // Tab
            if ($(self.selected).hasClass('dr-date-start')) {
              event.preventDefault();
              $('.dr-date-end', self.element).trigger('click');
            } else {
              self.calendarCheckDates();
              self.calendarSaveDates();
              self.calendarClose('force');
            }
          break;

          case 13: // Enter
            event.preventDefault();
            self.calendarCheckDates();
            self.calendarSetDates();
            self.calendarSaveDates();
            self.calendarClose('force');
          break;

          case 27: // ESC
            self.calendarSetDates();
            self.calendarClose('force');
          break;

          case 38: // Up
            event.preventDefault();
            var timeframe = 'day';

            if (event.shiftKey)
              timeframe = 'week';

            if (event.metaKey)
              timeframe = 'month';

            var back = moment(self.current_date).subtract(1, timeframe);

            $(this).html(back.format(this.display_format));
            self.current_date = back._d;
          break;

          case 40: // Down
            event.preventDefault();
            var timeframe = 'day';

            if (event.shiftKey)
              timeframe = 'week';

            if (event.metaKey)
              timeframe = 'month';

            var forward = moment(self.current_date).add(1, timeframe);

            $(this).html(forward.format(this.display_format));
            self.current_date = forward._d;
          break;
        }
      }
    });

    $('.dr-month-switcher i', this.element).click(function() {
      var m = $('.dr-month-switcher span', self.element).data( 'moment' );
      var y = $('.dr-year-switcher span', self.element).data( 'moment' );
      var this_moment = moment([y, m, 1]);
      var back = this_moment.clone().subtract(1, 'month');
      var forward = this_moment.clone().add(1, 'month').startOf('day');

      if ($(this).hasClass('dr-left')) {
        self.calendarOpen(self.selected, back);
      } else if ($(this).hasClass('dr-right')) {
        self.calendarOpen(self.selected, forward);
      }
    });

    $('.dr-year-switcher i', this.element).click(function() {
      var m = $('.dr-month-switcher span', self.element).data( 'moment' );
      var y = $('.dr-year-switcher span', self.element).data( 'moment' );
      var this_moment = moment([y, m, 1]);
      var back = this_moment.clone().subtract(1, 'year');
      var forward = this_moment.clone().add(1, 'year').startOf('day');

      if ($(this).hasClass('dr-left')) {
        self.calendarOpen(self.selected, back);
      } else if ($(this).hasClass('dr-right')) {
        self.calendarOpen(self.selected, forward);
      }
    });

    $('.dr-dates-dash', this.element).click(function() {
      $('.dr-date-start', self.element).trigger('click');
    });

    $(this.element).click(function(event) {
      $('html').one('click',function() {
        if (self.presetIsOpen)
          self.presetToggle();

        if (self.calIsOpen) {
          self.calendarSetDates();
          self.calendarClose('force');
        }
      });

      event.stopPropagation();
    });

    $(this.element).add('.dr-date', this.element).focus(function(event) {
      $('html').one('click',function() {
        if (self.calIsOpen) {
          self.calendarSetDates();
          self.calendarClose('force');
        }
      });

      event.stopPropagation();
    });
  }


  Calendar.prototype.presetToggle = function() {
    if (this.presetIsOpen == false) {
      this.presetIsOpen = true;
      this.presetCreate();
    } else if (this.presetIsOpen) {
      this.presetIsOpen = false;
    }

    if (this.calIsOpen == true)
      this.calendarClose();

    $('.dr-preset-list', this.element).slideToggle(200);
    $('.dr-input', this.element).toggleClass('dr-active');
    $('.dr-presets', this.element).toggleClass('dr-active');
  }


  Calendar.prototype.presetCreate = function() {
    var self = this;
    var date = this.latest_date;

    var s = new Date($('.dr-date-start', self.element).html());
    var e = new Date($('.dr-date-end', self.element).html());
    this.start_date = s == 'Invalid Date' ? this.start_date : s;
    this.end_date = e == 'Invalid Date' ? this.end_date : e;

    $('.dr-list-item', this.element).each(function() {
      var month_count = $(this).data('months');
      var last_day = moment(date).endOf('month').startOf('day');
      var is_last_day = last_day.isSame(date);
      var first_day;

      if (!is_last_day)
        last_day = moment(date).subtract(1, 'month').endOf('month').startOf('day');

      if (typeof month_count == 'number') {
        first_day = moment(date).subtract(is_last_day ? month_count - 1 : month_count, 'month').startOf('month');

        if (month_count == 12)
          first_day = moment(date).subtract(is_last_day ? 12 : 13, 'month').endOf('month').startOf('day');
      } else if (month_count == 'all') {
        first_day = moment(self.earliest_date);
        last_day = moment(self.latest_date);
      } else {
        first_day = moment(self.latest_date).subtract(30, 'day');
        last_day = moment(self.latest_date);
      }

      if (first_day.isBefore(self.earliest_date))
        return $(this).remove()
      $('.dr-item-aside', this).html(first_day.format( self.display_format ) +' – '+ last_day.format( self.display_format ));
    });
  }


  Calendar.prototype.calendarSetDates = function() {
    $('.dr-date-start', this.element).html(moment(this.start_date).format(this.display_format));
    $('.dr-date-end', this.element).html(moment(this.end_date).format(this.display_format));

    if (!this.start_date && !this.end_date) {
      var old_date = $('.dr-date', this.element).html();
      var new_date = moment(this.current_date).format(this.display_format);

      if (old_date != new_date)
        $('.dr-date', this.element).html(new_date);
    }
  }


  Calendar.prototype.calendarSaveDates = function() {
    return this.callback();
  }

  Calendar.prototype.calendarCheckDate = function( d ) {
    var regex = /(?!<=\d)(st|nd|rd|th)/;
    var d_array = d ? d.replace(regex, '').split(' ') : [];

    // Today
    if (d == 'today' || d == 'now')
      d = moment().isAfter(this.latest_date) ? this.latest_date : moment();

    // Earliest
    if (d == 'earliest')
      d = this.earliest_date;

    // Latest
    if (d == 'latest')
      d = this.latest_date;

    // Convert string to a date if keyword ago or ahead exists
    if (d && (d.toString().indexOf('ago') != -1 || d.toString().indexOf('ahead') != -1))
      d = this.stringToDate(d);

    // Add current year if year is not included
    if (d_array.length == 2) {
      d_array.push(moment().format(this.display_year_format))
      d = d_array.join(' ');
    }

    // Convert using settings format
    if (d && $.type( d ) === "string" ) {
      var parsed_d = moment( d, this.display_format );
      if ( parsed_d.isValid() )
        d = parsed_d;
    }

    return new Date( d );
  }

  Calendar.prototype.calendarCheckDates = function() {
    var s = $('.dr-date-start', this.element).html();
    var e = $('.dr-date-end', this.element).html();
    var c = $(this.selected).html();

    // Modify strings via some specific keywords to create valid dates
    // Year to date
    if (s == 'ytd' || e == 'ytd') {
      s = moment().startOf('year');
      e = moment().isAfter(this.latest_date) ? this.latest_date : moment();
    }

    // Finally set all strings as dates
    s = this.calendarCheckDate( s );
    e = this.calendarCheckDate( e );
    c = this.calendarCheckDate( c );

    // Is this a valid date?
    if ((s || e) &&
        (moment(s).isAfter(e) ||
        moment(e).isBefore(s) ||
        (moment(s).isSame(e) && !this.same_day) ||
        moment(s).isBefore(this.earliest_date) ||
        moment(e).isAfter(this.latest_date))) {
      return this.calendarSetDates();
    }

    // Push and save if it's valid otherwise return to previous state
    this.start_date = s == 'Invalid Date' ? this.start_date : s;
    this.end_date = e == 'Invalid Date' ? this.end_date : e;
    this.current_date = c == 'Invalid Date' ? this.current_date : c;
  }


  Calendar.prototype.stringToDate = function(str) {
    var date_arr = str.split(' ');

    if (date_arr[2] == 'ago') {
      return moment(this.current_date).subtract(date_arr[0], date_arr[1]);
    }

    else if (date_arr[2] == 'ahead') {
      return moment(this.current_date).add(date_arr[0], date_arr[1]);
    }

    return this.current_date;
  }


  Calendar.prototype.calendarOpen = function(selected, switcher) {
    var self = this;
    var other;
    var cal_width = $('.dr-dates', this.element).innerWidth() - 8;

    this.selected = selected || this.selected;

    if (this.presetIsOpen == true)
      this.presetToggle();

    if (this.calIsOpen == true)
      this.calendarClose(switcher ? 'switcher' : undefined);

    this.calendarCheckDates();
    this.calendarCreate(switcher);
    this.calendarSetDates();

    var next_month = moment(switcher || this.current_date).add(1, 'month').startOf('month').startOf('day');
    var past_month = moment(switcher || this.current_date).subtract(1, 'month').endOf('month');
    var next_year = moment(switcher || this.current_date).add(1, 'year').startOf('month').startOf('day');
    var past_year = moment(switcher || this.current_date).subtract(1, 'year').endOf('month');

    var this_moment = moment(switcher || this.current_date);
    $('.dr-month-switcher span', this.element)
      .html(this.transform_month(this_moment.format(this.display_month_format)))
      .data( 'moment', this_moment.month() );
    $('.dr-year-switcher span', this.element)
      .html(this.transform_year(this_moment.format(this.display_year_format)))
      .data( 'moment', this_moment.year() );

    $('.dr-switcher i', this.element).removeClass('dr-disabled');

    if (next_month.isAfter(this.latest_date))
      $('.dr-month-switcher .dr-right', this.element).addClass('dr-disabled');

    if (past_month.isBefore(this.earliest_date))
      $('.dr-month-switcher .dr-left', this.element).addClass('dr-disabled');

    if (next_year.isAfter(this.latest_date))
      $('.dr-year-switcher .dr-right', this.element).addClass('dr-disabled');

    if (past_year.isBefore(this.earliest_date))
      $('.dr-year-switcher .dr-left', this.element).addClass('dr-disabled');

    $('.dr-day', this.element).on({
      mouseenter: function() {
        var selected = $(this);
        var start_date = moment(self.start_date);
        var end_date = moment(self.end_date);
        var current_date = moment(self.current_date);

        if ($(self.selected).hasClass("dr-date-start")) {
          selected.addClass('dr-hover dr-hover-before');
          $('.dr-start', self.element).css({'border': 'none', 'padding-left': '0.3125rem'});
          setMaybeRange('start');
        }

        if ($(self.selected).hasClass("dr-date-end")) {
          selected.addClass('dr-hover dr-hover-after');
          $('.dr-end', self.element).css({'border': 'none', 'padding-right': '0.3125rem'});
          setMaybeRange('end');
        }

        if (!self.start_date && !self.end_date)
          selected.addClass('dr-maybe');

        $('.dr-selected', self.element).css('background-color', 'transparent');

        function setMaybeRange(type) {
          other = undefined;

          self.range(6 * 7).forEach(function(i) {
            var next = selected.next().data('date');
            var prev = selected.prev().data('date');
            var curr = selected.data('date');

            if (!curr)
              return false;

            if (!prev)
              prev = curr;

            if (!next)
              next = curr;

            if (type == 'start') {
              if (moment(next).isSame(self.end_date) || (self.same_day && moment(curr).isSame(self.end_date)))
                return false;

              if (moment(curr).isAfter(self.end_date)) {
                other = other || moment(curr).add(6, 'day').startOf('day');

                if (i > 5 || (next ? moment(next).isAfter(self.latest_date) : false)) {
                  $(selected).addClass('dr-end');
                  other = moment(curr);
                  return false;
                }
              }

              selected = selected.next().addClass('dr-maybe');
            } else if (type == 'end') {
              if (moment(prev).isSame(self.start_date) || (self.same_day && moment(curr).isSame(self.start_date)))
                return false;

              if (moment(curr).isBefore(self.start_date)) {
                other = other || moment(curr).subtract(6, 'day');

                if (i > 5 || (prev ? moment(prev).isBefore(self.earliest_date) : false)) {
                  $(selected).addClass('dr-start');
                  other = moment(curr);
                  return false;
                }
              }

              selected = selected.prev().addClass('dr-maybe');
            }
          });
        }
      },
      mouseleave: function() {
        if ($(this).hasClass('dr-hover-before dr-end'))
          $(this).removeClass('dr-end');

        if ($(this).hasClass('dr-hover-after dr-start'))
          $(this).removeClass('dr-start');

        $(this).removeClass('dr-hover dr-hover-before dr-hover-after');
        $('.dr-start, .dr-end', self.element).css({'border': '', 'padding': ''});
        $('.dr-maybe:not(.dr-current)', self.element).removeClass('dr-start dr-end');
        $('.dr-day', self.element).removeClass('dr-maybe');
        $('.dr-selected', self.element).css('background-color', '');
      },
      mousedown: function() {
        var date = $(this).data('date');
        var string = moment(date).format(this.display_format);

        if (other) {
          $('.dr-date', self.element)
            .not(self.selected)
            .html(other.format(this.display_format));
        }

        $(self.selected).html(string);
        self.calendarOpen(self.selected);

        if ($(self.selected).hasClass('dr-date-start')) {
          $('.dr-date-end', self.element).trigger('click');
        } else {
          self.calendarSaveDates();
          self.calendarClose('force');
        }
      }
    });

    $('.dr-calendar', this.element)
      .css('width', cal_width)
      .slideDown(200);
    $('.dr-input', this.element).addClass('dr-active');
    $(selected).addClass('dr-active').focus();
    $(this.element).addClass('dr-active');

    this.calIsOpen = true;
  }


  Calendar.prototype.calendarClose = function(type) {
    var self = this;

    if (!this.calIsOpen || this.presetIsOpen || type == 'force') {
      $('.dr-date', this.element).blur();
      $('.dr-calendar', this.element).slideUp(200, function() {
        $('.dr-day', self.element).remove();
      });
    } else {
      $('.dr-day', this.element).remove();
    }

    if (type == 'switcher') {
      return false;
    }

    $('.dr-input, .dr-date', this.element).removeClass('dr-active');
    $(this.element).removeClass('dr-active');

    this.calIsOpen = false;
  }


  Calendar.prototype.calendarArray = function(start, end, current, switcher) {
    var self = this;
    current = current || start || end;

    var first_day = moment(switcher || current).startOf('month');
    var last_day = moment(switcher || current).endOf('month');

    var current_month = {
      start: {
        day: +first_day.format('d'),
        str: +first_day.format('D')
      },
      end: {
        day: +last_day.format('d'),
        str: +last_day.format('D')
      }
    }


    // Beginning faded dates
    var d = undefined;

    var start_hidden = this.range(current_month.start.day).map(function() {
      if (d == undefined) {
        d = moment(first_day);
      } d = d.subtract(1, 'day');

      return {
        str: +d.format('D'),
        start: d.isSame(start),
        end: d.isSame(end),
        current: d.isSame(current),
        selected: d.isBetween(start, end),
        date: d.toISOString(),
        outside: d.isBefore(self.earliest_date),
        fade: true
      }
    }).reverse();


    // Leftover faded dates
    var leftover = (6 * 7) - (current_month.end.str + start_hidden.length);
    d = undefined;

    var end_hidden = this.range(leftover).map(function() {
      if (d == undefined) {
        d = moment(last_day);
      } d = d.add(1, 'day').startOf('day');

      return {
        str: +d.format('D'),
        start: d.isSame(start),
        end: d.isSame(end),
        current: d.isSame(current),
        selected: d.isBetween(start, end),
        date: d.toISOString(),
        outside: d.isAfter(self.latest_date),
        fade: true
      }
    });


    // Actual visible dates
    d = undefined;

    var visible = this.range(current_month.end.str).map(function() {
      if (d == undefined) {
        d = moment(first_day);
      } else {
        d = d.add(1, 'day').startOf('day');
      }

      return {
        str: +d.format('D'),
        start: d.isSame(start),
        end: d.isSame(end),
        current: d.isSame(current),
        selected: d.isBetween(start, end),
        date: d.toISOString(),
        outside: d.isBefore(self.earliest_date) || d.isAfter(self.latest_date),
        fade: false
      }
    });


    return start_hidden.concat(visible, end_hidden);
  }


  Calendar.prototype.calendarCreate = function(switcher) {
    var self = this;
    var array = this.calendarArray(this.start_date, this.end_date, this.current_date, switcher);

    array.forEach(function(d, i) {
      var classString = "dr-day";

      if (d.fade)
        classString += " dr-fade";

      if (d.start)
        classString += " dr-start";

      if (d.end)
        classString += " dr-end";

      if (d.current)
        classString += " dr-current";

      if (d.selected)
        classString += " dr-selected";

      if (d.outside)
        classString += " dr-outside";

      $('.dr-day-list', self.element).append('<li class="'+ classString +'" data-date="'+ d.date +'">'+ d.str +'</li>');
    });
  }


  Calendar.prototype.calendarHTML = function(type) {
    var ul_days_of_the_week = $( '<ul class="dr-days-of-week-list"></ul>' )
    var self = this;
    $.each( moment.weekdaysMin(), function( i, elem ) {
        ul_days_of_the_week.append( '<li class="dr-day-of-week">' + self.transform_day( elem ) + '</li>' ); }
    );

    if (type == "double")
      return this.element.append('<div class="dr-input">' +
        '<div class="dr-dates">' +
          '<div class="dr-date dr-date-start" contenteditable>'+ moment(this.start_date).format(this.display_format) +'</div>' +
          '<span class="dr-dates-dash">–</span>' +
          '<div class="dr-date dr-date-end" contenteditable>'+ moment(this.end_date).format(this.display_format) +'</div>' +
        '</div>' +

        '<div class="dr-presets">' +
          '<span class="dr-preset-bar"></span>' +
          '<span class="dr-preset-bar"></span>' +
          '<span class="dr-preset-bar"></span>' +
        '</div>' +
      '</div>' +

      '<div class="dr-selections">' +
        '<div class="dr-calendar" style="display: none;">' +
          '<div class="dr-range-switcher">' +
            '<div class="dr-switcher dr-month-switcher">' +
              '<i class="dr-left"></i>' +
              '<span>April</span>' +
              '<i class="dr-right"></i>' +
            '</div>' +
            '<div class="dr-switcher dr-year-switcher">' +
              '<i class="dr-left"></i>' +
              '<span>2015</span>' +
              '<i class="dr-right"></i>' +
            '</div>' +
          '</div>' +
          ul_days_of_the_week[0].outerHTML +
          '<ul class="dr-day-list"></ul>' +
        '</div>' +

        '<ul class="dr-preset-list" style="display: none;">' +
          '<li class="dr-list-item" data-months="days">Last 30 days <span class="dr-item-aside"></span></li>' +
          '<li class="dr-list-item" data-months="1">Last month <span class="dr-item-aside"></span></li>' +
          '<li class="dr-list-item" data-months="3">Last 3 months <span class="dr-item-aside"></span></li>' +
          '<li class="dr-list-item" data-months="6">Last 6 months <span class="dr-item-aside"></span></li>' +
          '<li class="dr-list-item" data-months="12">Last year <span class="dr-item-aside"></span></li>' +
          '<li class="dr-list-item" data-months="all">All time <span class="dr-item-aside"></span></li>' +
        '</ul>' +
      '</div>');

    return this.element.append('<div class="dr-input">' +
      '<div class="dr-dates">' +
        '<div class="dr-date" contenteditable>'+ moment(this.current_date).format(this.display_format) +'</div>' +
      '</div>' +
    '</div>' +

    '<div class="dr-selections">' +
      '<div class="dr-calendar" style="display: none;">' +
        '<div class="dr-range-switcher">' +
          '<div class="dr-switcher dr-month-switcher">' +
            '<i class="dr-left"></i>' +
            '<span></span>' +
            '<i class="dr-right"></i>' +
          '</div>' +
          '<div class="dr-switcher dr-year-switcher">' +
            '<i class="dr-left"></i>' +
            '<span></span>' +
            '<i class="dr-right"></i>' +
          '</div>' +
        '</div>' +
        ul_days_of_the_week[0].outerHTML +
        '<ul class="dr-day-list"></ul>' +
      '</div>' +
    '</div>');
  }


  Calendar.prototype.range = function(length) {
    var range = new Array(length);

    for (var idx = 0; idx < length; idx++) {
      range[idx] = idx;
    }

    return range;
  }


  return Calendar;
}));
