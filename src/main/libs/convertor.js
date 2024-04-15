const Marked  = require('marked');
const Html2Md = require('html-to-md');

Marked.use({
    renderer: {
        link(href, title, text) {
            return `<a href="${href}" target="_blank" title="${title}">${text}</a>`;
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
    toHtml: (content) => Marked.parse(
        content.replace(/\n{2,}/g, '\n')
    ).replace(/\n/g, ''),

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
    toMd: (content) => Html2Md(content).replace(/\\_/g, '_')

}