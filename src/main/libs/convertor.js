const Marked  = require('marked');
const Html2Md = require('node-html-markdown');

Marked.use({
    renderer: {
        link(item) {
            return `<a href="${item.href}" target="_blank" title="${item.title}">${item.text}</a>`;
        },
        listitem(item) {
            return '<li>' + item.text.replace('<p>', '').replace('</p>', '') + '</li>';
        }
    }
});

module.exports = {

    /**
     * Converting MD to HTML
     *
     * @param {String} content
     *
     * @returns {String}
     */
    toHtml: (content) => Marked.parse(content).replace(/\n/g, ''),

    /**
     * Convert HTML string to MD string
     *
     * There are some known issues with MD convertor. For example, the function name
     * like get_users, will be converted to get\\_users. This is probably due to the
     * fact that it is not an italic annotation.
     *
     * @param {String} content
     *
     * @returns {String}
     */
    toMd: (content, options = {}) => Html2Md.NodeHtmlMarkdown.translate(
        content,
        options,
        {
            a: ({ node, options }) => {
                const href = node.getAttribute('href');
                let link   = href;

                if (href.indexOf('http') !== 0) {
                    link = options.baseUrl + href;
                }

                const response = {
                    content: ''
                };

                if (node.innerHTML !== '#') {
                    response.content = node.innerText.replace('open in new window', '');
                    response.prefix  = '[';
                    response.postfix = '](' + link + ')';
                }

                return response;
            },
            img: () => ({ content: '' })
        }
    ).replace(/\\_/g, '_')

}