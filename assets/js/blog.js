(function() {
    var postsContainer = document.getElementById('medium-posts');
    var mediumProfileUrl = 'https://medium.com/@kmes9940211';

    if (!postsContainer)
        return;

    function safeUrl(value, fallback) {
        try {
            var url = new URL(value, window.location.href);
            return url.protocol === 'https:' ? url.href : fallback;
        }
        catch (error) {
            return fallback;
        }
    }

    function externalLink(url, className) {
        var link = document.createElement('a');
        link.href = safeUrl(url, mediumProfileUrl);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (className)
            link.className = className;
        return link;
    }

    function publishedDate(value) {
        var date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime()))
            return null;

        return {
            datetime: date.toISOString(),
            label: new Intl.DateTimeFormat('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date)
        };
    }

    function renderMessage(message) {
        var paragraph = document.createElement('p');
        paragraph.textContent = message + ' ';
        var profileLink = externalLink(mediumProfileUrl);
        profileLink.textContent = '前往 Medium';
        paragraph.appendChild(profileLink);
        postsContainer.classList.remove('posts-ready');
        postsContainer.replaceChildren(paragraph);
        postsContainer.setAttribute('aria-busy', 'false');
    }

    function renderPost(post) {
        var article = document.createElement('article');
        article.className = 'post-card';

        var title = document.createElement('h3');
        var titleLink = externalLink(post.url);
        titleLink.textContent = post.title || '未命名文章';
        title.appendChild(titleLink);
        article.appendChild(title);

        var date = publishedDate(post.publishedAt);
        if (date) {
            var time = document.createElement('time');
            time.className = 'post-meta';
            time.dateTime = date.datetime;
            time.textContent = date.label;
            article.appendChild(time);
        }

        var imageUrl = post.image ? safeUrl(post.image, '') : '';
        if (imageUrl) {
            var imageLink = externalLink(post.url, 'image fit');
            var image = document.createElement('img');
            image.src = imageUrl;
            image.alt = post.title || 'Medium 文章首圖';
            image.loading = 'lazy';
            image.decoding = 'async';
            imageLink.appendChild(image);
            article.appendChild(imageLink);
        }

        var summary = document.createElement('p');
        summary.textContent = post.summary || '點擊閱讀完整文章。';
        article.appendChild(summary);

        var actions = document.createElement('ul');
        actions.className = 'actions';
        var actionItem = document.createElement('li');
        var readMore = externalLink(post.url, 'button primary');
        readMore.textContent = '閱讀全文';
        actionItem.appendChild(readMore);
        actions.appendChild(actionItem);
        article.appendChild(actions);
        return article;
    }

    fetch('blog.json', { cache: 'no-cache' })
        .then(function(response) {
            if (!response.ok)
                throw new Error('blog.json request failed');
            return response.json();
        })
        .then(function(data) {
            if (!data.posts || !data.posts.length) {
                renderMessage('目前沒有文章，或暫時無法載入。');
                return;
            }

            var fragment = document.createDocumentFragment();
            data.posts.forEach(function(post) {
                fragment.appendChild(renderPost(post));
            });
            postsContainer.classList.add('posts-ready');
            postsContainer.replaceChildren(fragment);
            postsContainer.setAttribute('aria-busy', 'false');
        })
        .catch(function() {
            renderMessage('載入文章時發生錯誤。');
        });
})();
