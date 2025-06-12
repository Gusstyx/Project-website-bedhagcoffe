// Inisialisasi saat dokumen siap
$(document).ready(function () {
  "use strict";

  const windowHeight = window.innerHeight;
  const headerHeight = $(".default-header").height();
  const fitscreen = windowHeight - headerHeight;

  $(".fullscreen").css("height", windowHeight);
  $(".fitscreen").css("height", fitscreen);

  if (document.getElementById("default-select")) {
    $('select').niceSelect();
  }

  $('.img-pop-up, .img-pop-home').magnificPopup({
    type: 'image',
    gallery: { enabled: true }
  });

  $('.play-btn').magnificPopup({
    type: 'iframe',
    mainClass: 'mfp-fade',
    removalDelay: 160,
    preloader: false,
    fixedContentPos: false
  });

  if ($('.single-counter').length) {
    $('.counter').counterUp({ delay: 10, time: 1000 });
  }

  $('.nav-menu').superfish({
    animation: { opacity: 'show' },
    speed: 400
  });

  // Mobile Navigation
  if ($('#nav-menu-container').length) {
    const $mobileNav = $('#nav-menu-container').clone().prop({ id: 'mobile-nav' });
    $mobileNav.find('> ul').attr({ class: '', id: '' });
    $('body').append($mobileNav);
    $('body').prepend('<button type="button" id="mobile-nav-toggle"><i class="lnr lnr-menu"></i></button>');
    $('body').append('<div id="mobile-body-overly"></div>');
    $('#mobile-nav').find('.menu-has-children').prepend('<i class="lnr lnr-chevron-down"></i>');

    $(document).on('click', '.menu-has-children i', function () {
      $(this).next().toggleClass('menu-item-active');
      $(this).nextAll('ul').eq(0).slideToggle();
      $(this).toggleClass("lnr-chevron-up lnr-chevron-down");
    });

    $(document).on('click', '#mobile-nav-toggle', function () {
      $('body').toggleClass('mobile-nav-active');
      $('#mobile-nav-toggle i').toggleClass('lnr-cross lnr-menu');
      $('#mobile-body-overly').toggle();
    });

    $(document).click(function (e) {
      const container = $("#mobile-nav, #mobile-nav-toggle");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('#mobile-nav-toggle i').toggleClass('lnr-cross lnr-menu');
          $('#mobile-body-overly').fadeOut();
        }
      }
    });
  } else if ($("#mobile-nav, #mobile-nav-toggle").length) {
    $("#mobile-nav, #mobile-nav-toggle").hide();
  }

  $('.nav-menu a, #mobile-nav a, .scrollto').on('click', function () {
    if (location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') && location.hostname === this.hostname) {
      const target = $(this.hash);
      if (target.length) {
        let top_space = $('#header').length ? $('#header').outerHeight() : 0;
        $('html, body').animate({ scrollTop: target.offset().top - top_space }, 1500, 'easeInOutExpo');

        if ($(this).parents('.nav-menu').length) {
          $('.nav-menu .menu-active').removeClass('menu-active');
          $(this).closest('li').addClass('menu-active');
        }

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('#mobile-nav-toggle i').toggleClass('lnr-times lnr-bars');
          $('#mobile-body-overly').fadeOut();
        }
        return false;
      }
    }
  });

  $('html, body').hide();
  if (window.location.hash) {
    setTimeout(() => {
      $('html, body').scrollTop(0).show();
      $('html, body').animate({ scrollTop: $(window.location.hash).offset().top }, 1000);
    }, 0);
  } else {
    $('html, body').show();
  }

  $(window).scroll(function () {
    $('#header').toggleClass('header-scrolled', $(this).scrollTop() > 100);
  });

  $('.active-course-carusel').owlCarousel({
    items: 3,
    loop: true,
    margin: 30,
    dots: true,
    nav: true,
    navText: ["<span class='lnr lnr-arrow-up'></span>", "<span class='lnr lnr-arrow-down'></span>"],
    responsive: {
      0: { items: 1 },
      480: { items: 1 },
      768: { items: 2 },
      900: { items: 3 }
    }
  });

  $('.active-tstimonial-carusel').owlCarousel({
    items: 3,
    margin: 30,
    autoplay: true,
    loop: true,
    dots: true,
    responsive: {
      0: { items: 1 },
      480: { items: 1 },
      768: { items: 2 },
      900: { items: 3 }
    }
  });

  if (document.getElementById("map")) {
    google.maps.event.addDomListener(window, 'load', function () {
      const mapOptions = {
        zoom: 11,
        center: new google.maps.LatLng(40.6700, -73.9400),
        styles: [/* style JSON disingkat */]
      };

      const mapElement = document.getElementById('map');
      const map = new google.maps.Map(mapElement, mapOptions);

      new google.maps.Marker({
        position: new google.maps.LatLng(40.6700, -73.9400),
        map: map,
        title: 'Snazzy!'
      });
    });
  }

  $('#mc_embed_signup').find('form').ajaxChimp();
});


window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});