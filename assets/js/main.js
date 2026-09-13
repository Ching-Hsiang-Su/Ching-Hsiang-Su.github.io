/*
	Paradigm Shift by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body');

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Smooth in-page navigation.
		$('.scrolly').on('click', function(event) {
			var selector = $(this).attr('href'),
				target = selector && selector.charAt(0) === '#' ? document.querySelector(selector) : null;

			if (!target)
				return;

			event.preventDefault();
			target.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
			});
		});

	// Portfolio data.
		var imagePath = function(category, index, size) {
			var number = index < 10 ? '0' + index : String(index),
				directory = category.imageDirectory;

			if (size === 'thumbnail' && category.thumbnailDirectory)
				directory += '/' + category.thumbnailDirectory;
			else if (size === 'medium' && category.mediumDirectory)
				directory += '/' + category.mediumDirectory;

			return directory + '/' + category.imagePrefix + '-' + number + '.' + (category.extension || 'webp');
		};

		var renderProject = function($container, categoryName, category, project) {
			var start = parseInt(project.start, 10),
				count = parseInt(project.count, 10),
				label = project.galleryLabel || project.title || '攝影作品',
				responsiveSizes = (category.layout === 'carousel') ? '(max-width: 736px) 90vw, (max-width: 980px) 45vw, 42vw' : '(max-width: 600px) 90vw, 45vw',
				$group = $('<section />', {
					'class': 'portfolio-group',
					id: project.id || undefined
				}),
				$meta = $('<span class="portfolio-group-meta"></span>'),
				$gallery = $('<div class="gallery portfolio-gallery"></div>').attr({
					'data-gallery-category': categoryName,
					'data-gallery-layout': category.layout || 'grid',
					'data-gallery-start': start,
					'data-gallery-count': count,
					'data-gallery-label': label
				});

			if (project.year) {
				$meta.append($('<time />', {
					datetime: project.year,
					text: project.year
				}));

				if (project.type)
					$meta.append(document.createTextNode('・' + project.type));
			}
			else
				$meta.text(project.meta || project.type || '');

			if ($meta.text())
				$group.append($meta);

			$group.append($('<h2 class="portfolio-group-title"></h2>').text(project.title));

			for (var offset = 0; offset < count; offset++) {
				var index = start + offset,
					source = imagePath(category, index, 'full'),
					thumbnailSource = imagePath(category, index, 'thumbnail'),
					mediumSource = imagePath(category, index, 'medium'),
					dimensions = category.dimensions && category.dimensions[index],
					$image = $('<img />', {
						src: thumbnailSource,
						srcset: thumbnailSource + ' 720w, ' + mediumSource + ' 1200w',
						sizes: responsiveSizes,
						alt: label + '第' + (offset + 1) + '張',
						loading: 'lazy',
						decoding: 'async'
					});

				if (category.thumbnailDirectory)
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

			$group.append($gallery).appendTo($container);
		};

		var renderPhotoCategories = function(data) {
			$('.portfolio-groups[data-portfolio-category]').each(function() {
				var $container = $(this),
					categoryName = $container.attr('data-portfolio-category'),
					category = data.categories && data.categories[categoryName];

				$container.empty().attr('aria-busy', 'false');

				if (!category || !category.projects)
					throw new Error('找不到作品分類：' + categoryName);

				$.each(category.projects, function(_index, project) {
					renderProject($container, categoryName, category, project);
				});
			});
		};

		var renderVideos = function(data) {
			$('[data-portfolio-videos]').each(function() {
				var $container = $(this),
					category = data.categories && data.categories.video;

				$container.empty().attr('aria-busy', 'false');

				if (!category || !category.videos)
					throw new Error('找不到影片作品');

				$.each(category.videos, function(_index, video) {
					var source = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.youtubeId),
						$iframe = $('<iframe />', {
							src: source,
							title: video.title,
							loading: 'lazy',
							referrerpolicy: 'strict-origin-when-cross-origin',
							allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
							allowfullscreen: 'allowfullscreen'
						}),
						$frame = $('<div class="video-frame"></div>').append($iframe),
						$card = $('<article class="video-card"></article>')
							.append($frame)
							.append($('<h3></h3>').text(video.title));

					$container.append($card);
				});
			});
		};

		var initializePortfolioCarousels = function() {
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
		};

		var $portfolioDataTargets = $('.portfolio-groups[data-portfolio-category], [data-portfolio-videos]');

		if ($portfolioDataTargets.length) {
			$.ajax({
				url: 'portfolio.json',
				dataType: 'json',
				cache: false
			})
				.done(function(data) {
					try {
						renderPhotoCategories(data);
						renderVideos(data);
						initializePortfolioCarousels();
					}
					catch (error) {
						$portfolioDataTargets
							.empty()
							.attr('aria-busy', 'false')
							.append($('<p class="portfolio-data-error"></p>').text('作品資料暫時無法載入，請稍後再試。'));
						window.console.error(error);
					}
				})
				.fail(function(_request, _status, error) {
					$portfolioDataTargets
						.empty()
						.attr('aria-busy', 'false')
						.append($('<p class="portfolio-data-error"></p>').text('作品資料暫時無法載入，請稍後再試。'));
					window.console.error('portfolio.json 載入失敗：', error);
				});
		}

		if (!$('.gallery a').length && !$portfolioDataTargets.length)
			return;

	// Gallery.
		var $galleryModalHost = $('<div class="gallery gallery-lightbox-host"></div>').appendTo($body),
			$galleryModal = $('<div class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-hidden="true" aria-label="作品預覽"><button type="button" class="modal-close" aria-label="關閉作品預覽"></button><button type="button" class="modal-navigation previous" aria-label="上一張"></button><div class="inner"><img alt="" /></div><button type="button" class="modal-navigation next" aria-label="下一張"></button><span class="modal-status" aria-live="polite"></span></div>').appendTo($galleryModalHost),
			$galleryImage = $galleryModal.find('img'),
			$galleryClose = $galleryModal.find('.modal-close'),
			$galleryPrevious = $galleryModal.find('.modal-navigation.previous'),
			$galleryNext = $galleryModal.find('.modal-navigation.next'),
			$galleryStatus = $galleryModal.find('.modal-status'),
			swipeStart = null;

		var getGalleryItems = function($link) {
			return $link.closest('.gallery').find('a').filter(function() {
				return ($(this).attr('href') || '').match(/\.(jpe?g|gif|png|webp)(\?.*)?$/i);
			});
		};

		var showGalleryImage = function(index) {
			var items = $galleryModal[0]._items || $(),
				count = items.length;

			if (!count)
				return;

			index = Math.max(0, Math.min(index, count - 1));
			var $link = items.eq(index),
				href = $link.attr('href'),
				alt = $link.find('img').attr('alt') || '';

			$galleryModal[0]._index = index;
			$galleryModal.removeClass('loaded').toggleClass('single-image', count === 1);
			$galleryImage.attr({ src: href, alt: alt });
			$galleryPrevious.prop('disabled', index === 0);
			$galleryNext.prop('disabled', index === count - 1);
			$galleryStatus.text((index + 1) + ' / ' + count);
		};

		var moveGalleryImage = function(direction) {
			if (!$galleryModal.hasClass('visible'))
				return;

			showGalleryImage(($galleryModal[0]._index || 0) + direction);
		};

		var closeGallery = function() {
			if ($galleryModal[0]._closing || !$galleryModal.hasClass('visible'))
				return;

			$galleryModal[0]._closing = true;
			$galleryModal.removeClass('loaded visible').attr('aria-hidden', 'true');
			$body.removeClass('is-modal-open');

			window.setTimeout(function() {
				$galleryImage.removeAttr('src').attr('alt', '');
				$galleryModal[0]._closing = false;

				if ($galleryModal[0]._returnFocus)
					$($galleryModal[0]._returnFocus).trigger('focus');

				$galleryModal[0]._returnFocus = null;
				$galleryModal[0]._items = null;
			}, 500);
		};

		$body.on('click', '.gallery a', function(event) {

			var $a = $(this),
				href = $a.attr('href'),
				$items = getGalleryItems($a);

			if (!href.match(/\.(jpe?g|gif|png|webp)(\?.*)?$/i))
				return;

			event.preventDefault();
			event.stopPropagation();

			$galleryModal[0]._returnFocus = $a[0];
			$galleryModal[0]._items = $items;
			showGalleryImage($items.index($a));

			$galleryModal
				.addClass('visible')
				.attr('aria-hidden', 'false');
			$body.addClass('is-modal-open');

			window.setTimeout(function() {
				$galleryClose[0].focus();
			}, 100);

		});

		$galleryClose.on('click', closeGallery);
		$galleryPrevious.on('click', function() { moveGalleryImage(-1); });
		$galleryNext.on('click', function() { moveGalleryImage(1); });

		$galleryModal
			.on('click', function(event) {
				if (event.target === this)
					closeGallery();
			})
			.on('keydown', function(event) {

				if (event.key === 'Escape') {
					event.preventDefault();
					closeGallery();
				}
				else if (event.key === 'ArrowLeft') {
					event.preventDefault();
					moveGalleryImage(-1);
				}
				else if (event.key === 'ArrowRight') {
					event.preventDefault();
					moveGalleryImage(1);
				}

				if (event.key === 'Tab') {
					var $controls = $galleryModal.find('button:not(:disabled)'),
						first = $controls[0],
						last = $controls[$controls.length - 1];

					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last.focus();
					}
					else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first.focus();
					}
				}

			})
			.on('touchstart', '.inner', function(event) {
				var touch = event.originalEvent.touches[0];
				swipeStart = { x: touch.clientX, y: touch.clientY };
			})
			.on('touchend', '.inner', function(event) {
				if (!swipeStart)
					return;

				var touch = event.originalEvent.changedTouches[0],
					deltaX = touch.clientX - swipeStart.x,
					deltaY = touch.clientY - swipeStart.y;

				swipeStart = null;
				if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY))
					moveGalleryImage(deltaX > 0 ? -1 : 1);
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
