/*
	Paradigm Shift by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body');

	// Breakpoints.
		breakpoints({
			default:   ['1681px',   null       ],
			xlarge:    ['1281px',   '1680px'   ],
			large:     ['981px',    '1280px'   ],
			medium:    ['737px',    '980px'    ],
			small:     ['481px',    '736px'    ],
			xsmall:    ['361px',    '480px'    ],
			xxsmall:   [null,       '360px'    ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Hack: Enable IE workarounds.
		if (browser.name == 'ie')
			$body.addClass('is-ie');

	// Mobile?
		if (browser.mobile)
			$body.addClass('is-mobile');

	// Scrolly.
		$('.scrolly')
			.scrolly({
				offset: 100
			});

	// Portfolio galleries.
		var portfolioImageDimensions = {
			landscape: {
				1: [1280, 468],
				2: [1048, 1600],
				3: [1046, 1600],
				4: [882, 1350],
				5: [1280, 864],
				6: [1269, 1600],
				7: [1280, 848],
				8: [1280, 842]
			}
		};

		$('.portfolio-gallery[data-gallery-category]').each(function() {

			var $gallery = $(this),
				category = $gallery.data('gallery-category'),
				thumbnailDirectory = $gallery.data('gallery-thumbnail-directory'),
				start = parseInt($gallery.data('gallery-start'), 10) || 1,
				count = parseInt($gallery.data('gallery-count'), 10),
				label = $gallery.data('gallery-label') || '攝影作品';

			if (!category || !count)
				return;

			for (var offset = 0; offset < count; offset++) {
				var index = start + offset,
					number = ('0' + index).slice(-2),
					source = 'images/portfolio/' + category + '/' + category + '-' + number + '.webp',
					dimensions = portfolioImageDimensions[category] && portfolioImageDimensions[category][index],
					thumbnailSource = thumbnailDirectory
						? 'images/portfolio/' + category + '/' + thumbnailDirectory + '/' + category + '-' + number + '.webp'
						: source,
					$image = $('<img />', {
						src: thumbnailSource,
						alt: label + '第' + (offset + 1) + '張',
						loading: 'lazy',
						decoding: 'async'
					});

				if (thumbnailDirectory)
					$image.attr('fetchpriority', 'low');

				if (dimensions)
					$image.attr({
						width: dimensions[0],
						height: dimensions[1]
					});

				$('<a />', {
					href: source,
					'aria-label': '放大查看' + label + '第' + (offset + 1) + '張'
				})
					.append($image)
					.appendTo($gallery);
			}

		});

		$('.portfolio-gallery[data-gallery-layout="carousel"]').each(function() {

			var $track = $(this),
				track = $track[0],
				count = parseInt($track.data('gallery-count'), 10),
				label = $track.data('gallery-label') || '作品',
				$previous = $('<button type="button" class="portfolio-carousel-button previous" aria-label="上一張"></button>'),
				$next = $('<button type="button" class="portfolio-carousel-button next" aria-label="下一張"></button>'),
				$status = $('<span class="portfolio-carousel-status" aria-live="polite"></span>');

			$track
				.addClass('portfolio-carousel-track')
				.attr({
					role: 'region',
					'aria-label': label + '照片輪播',
					'aria-roledescription': 'carousel',
					tabindex: '0'
				})
				.wrap('<div class="portfolio-carousel"></div>');

			$('<div class="portfolio-carousel-controls"></div>')
				.append($status, $previous, $next)
				.insertAfter($track);

			var getStep = function() {
				var card = $track.children('a').get(0),
					styles = window.getComputedStyle(track),
					gap = parseFloat(styles.columnGap || styles.gap) || 0;

				return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
			};

			var updateControls = function() {
				var maximum = Math.max(0, track.scrollWidth - track.clientWidth),
					current = Math.min(count, Math.round(track.scrollLeft / getStep()) + 1);

				$previous.prop('disabled', track.scrollLeft <= 1);
				$next.prop('disabled', track.scrollLeft >= maximum - 1);
				$status.text(current + ' / ' + count);
			};

			var move = function(direction) {
				var destination = track.scrollLeft + (getStep() * direction);

				if (typeof track.scrollTo === 'function')
					track.scrollTo({ left: destination, behavior: 'smooth' });
				else
					$track.stop().animate({ scrollLeft: destination }, 250);
			};

			$previous.on('click', function() { move(-1); });
			$next.on('click', function() { move(1); });
			$track.on('scroll', updateControls);
			$window.on('resize', updateControls);
			updateControls();

		});

	// Polyfill: Object fit.
		if (!browser.canUse('object-fit')) {

			$('.image[data-position]').each(function() {

				var $this = $(this),
					$img = $this.children('img');

				// Apply img as background.
					$this
						.css('background-image', 'url("' + $img.attr('src') + '")')
						.css('background-position', $this.data('position'))
						.css('background-size', 'cover')
						.css('background-repeat', 'no-repeat');

				// Hide img.
					$img
						.css('opacity', '0');

			});

			$('.gallery > a').each(function() {

				var $this = $(this),
					$img = $this.children('img');

				// Apply img as background.
					$this
						.css('background-image', 'url("' + $img.attr('src') + '")')
						.css('background-position', 'center')
						.css('background-size', 'cover')
						.css('background-repeat', 'no-repeat');

				// Hide img.
					$img
						.css('opacity', '0');

			});

		}

	// Gallery.
		var $galleryModalHost = $('<div class="gallery gallery-lightbox-host"></div>').appendTo($body),
			$galleryModal = $('<div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-hidden="true" aria-label="作品預覽"><button type="button" class="modal-close" aria-label="關閉作品預覽"></button><div class="inner"><img src="" alt="" /></div></div>').appendTo($galleryModalHost);

		$('.gallery').on('click', 'a', function(event) {

			var $a = $(this),
				$modalImg = $galleryModal.find('img'),
				$modalClose = $galleryModal.find('.modal-close'),
				href = $a.attr('href'),
				alt = $a.find('img').attr('alt') || '';

			if (!href.match(/\.(jpe?g|gif|png|webp)(\?.*)?$/i))
				return;

			event.preventDefault();
			event.stopPropagation();

			if ($galleryModal[0]._locked)
				return;

			$galleryModal[0]._locked = true;
			$galleryModal[0]._returnFocus = $a[0];

			$modalImg
				.attr('src', href)
				.attr('alt', alt);

			$galleryModal
				.addClass('visible')
				.attr('aria-hidden', 'false');
			$body.addClass('is-modal-open');

			window.setTimeout(function() {
				$modalClose[0].focus();
			}, 100);

			setTimeout(function() {
				$galleryModal[0]._locked = false;
			}, 600);

		});

		$galleryModal
			.on('click', function(event) {

				var $modal = $(this),
					$modalImg = $modal.find('img');

				if ($modal[0]._locked || !$modal.hasClass('visible'))
					return;

				event.stopPropagation();
				$modal[0]._locked = true;
				$modal.removeClass('loaded');

				setTimeout(function() {

					$modal
						.removeClass('visible')
						.attr('aria-hidden', 'true');
					$body.removeClass('is-modal-open');

					setTimeout(function() {

						$modalImg
							.attr('src', '')
							.attr('alt', '');

						$modal[0]._locked = false;

						if ($modal[0]._returnFocus)
							$($modal[0]._returnFocus).trigger('focus');
						else
							$body.trigger('focus');

						$modal[0]._returnFocus = null;

					}, 475);

				}, 125);

			})
			.on('keydown', function(event) {

				if (event.keyCode == 27)
					$galleryModal.trigger('click');

				if (event.keyCode == 9) {
					event.preventDefault();
					$galleryModal.find('.modal-close')[0].focus();
				}

			})
			.on('mouseup mousedown mousemove', function(event) {
				event.stopPropagation();
			})
			.find('img')
				.on('load', function() {

					setTimeout(function() {

						if (!$galleryModal.hasClass('visible'))
							return;

						$galleryModal.addClass('loaded');

					}, 275);

				});

})(jQuery);
