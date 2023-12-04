const Marked  = require('marked');
const Html2Md = require('html-to-md');

Marked.use({
    renderer: {
        link(href, title, text) {
            return `<a href="${href}" target="_blank" title="${title}">${text}</a>`;
        }
    }
});

export default {

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
     *
     * @param {*} content
     * @returns
     */
    toMd: (content) => Html2Md(content)

}