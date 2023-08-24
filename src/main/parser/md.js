const Marked = require('marked');
const _      = require('lodash');

// Custom tokenizer
const tokenizer = {
    hr(src) {
        const match = src.match(/^---(.*?)---/gs);

        if (match) {
            const stripped = match[0].replace(/---/g, '').trim();

            return {
                type: 'hr',
                raw: match[0],
                text: stripped,
                tokens: stripped.split('\n').map((l) => {
                    const chunk = l.split(':').map(c => c.trim());

                    return {
                        type: 'tag',
                        raw: l,
                        name: chunk[0],
                        value: chunk[1]
                    }
                })
            }
        } else {
            return false;
        }
    }
}

Marked.use({ tokenizer });

/**
 *
 */
const Normalizer = {

    /**
     * Extract ONLY title and return it as string
     *
     * @param {Object} block
     *
     * @returns {String}
    */
    hr: (block) => {
        let response = null;

        _.forEach(block.tokens, (t) => {
            if (t.type === 'tag' && t.name === 'title') {
                response = t.value.trim();
            }
        });

        return response;
    },

    /**
     * Header just uppercase it
     *
     * @param {Object} block
     *
     * @returns {String}
     */
    heading: (block) => {
        return `${block.text.toUpperCase().trim()}`
    },

    /**
     * Normalize paragraph by removing images and links
     *
     * @param {Object} block
     *
     * @returns {String}
     */
    paragraph: (block) => {
        let response = block.text;

        _.forEach(block.tokens, (t) => {
            if (t.type === 'link') {
                response = response.replace(t.raw, t.text);
            } else if (t.type === 'image') {
                response = response.replace(t.raw, '');
            }
        });

        return `${response.trim()}\n`;
    }

};

export default {

    parse: async (content) => {
        const response = {
            title: null,
            content: ''
        }
        const blocks = [];
        const tokens = Marked.Lexer.lex(content);

        _.forEach(tokens, (token) => {
            let block = null;

            if (token.type === 'hr') {
                response.title = Normalizer.hr(token);
            } else if (!_.isUndefined(Normalizer[token.type])) {
                block = Normalizer[token.type](token);
            }

            if (!_.isNull(block)) {
                blocks.push(block);
            }
        });

        response.content = blocks.join('\n').replace(/\n{3,}/g,'\n\n').trim();

        return response;
    }

}